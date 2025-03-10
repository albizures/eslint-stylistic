/**
 * @fileoverview Utility functions for AST
 */
import type { AST, Rule } from 'eslint'
import type ESTraverse from 'estraverse'
import { traverse as _traverse } from 'estraverse'
import type { FunctionDeclaration } from 'estree'
import type { TSESLint } from '@typescript-eslint/utils'
import type { ASTNode, ESNode } from './types'

/**
 * Wrapper for estraverse.traverse
 *
 * @param {ASTNode} ASTnode The AST node being checked
 * @param {object} visitor Visitor Object for estraverse
 */
export function traverse(ASTnode: ESNode, visitor: ESTraverse.Visitor) {
  const opts = Object.assign({}, {
    fallback(node: ASTNode) {
      return Object.keys(node).filter(key => key === 'children' || key === 'argument')
    },
  }, visitor)

  opts.keys = Object.assign({}, visitor.keys, {
    JSXElement: ['children'],
    JSXFragment: ['children'],
  })

  _traverse(ASTnode, opts)
}

/**
 * Helper function for traversing "returns" (return statements or the
 * returned expression in the case of an arrow function) of a function
 *
 * @param {ASTNode} ASTNode The AST node being checked
 * @param {Context} context The context of `ASTNode`.
 * @param {(returnValue: ASTNode, breakTraverse: () => void) => void} onReturn
 *   Function to execute for each returnStatement found
 * @returns {undefined}
 */
export function traverseReturns(
  ASTNode: ESNode,
  context: Rule.RuleContext,
  onReturn: (returnValue: ESNode | null | undefined, breakTraverse: () => void) => void,
) {
  const nodeType = ASTNode.type

  if (nodeType === 'ReturnStatement') {
    onReturn(ASTNode.argument, () => {})
    return
  }

  if (nodeType === 'ArrowFunctionExpression' && ASTNode.expression) {
    onReturn(ASTNode.body, () => {})
    return
  }

  /* TODO: properly warn on React.forwardRefs having typo properties
  if (nodeType === 'CallExpression') {
    const callee = ASTNode.callee;
    const pragma = pragmaUtil.getFromContext(context);
    if (
      callee.type === 'MemberExpression'
      && callee.object.type === 'Identifier'
      && callee.object.name === pragma
      && callee.property.type === 'Identifier'
      && callee.property.name === 'forwardRef'
      && ASTNode.arguments.length > 0
    ) {
      return enterFunc(ASTNode.arguments[0]);
    }
    return;
  }
  */

  if (
    nodeType !== 'FunctionExpression'
    && nodeType !== 'FunctionDeclaration'
    && nodeType !== 'ArrowFunctionExpression'
    && nodeType !== 'MethodDefinition'
  )
    return

  traverse((ASTNode as FunctionDeclaration).body, {
    enter(node) {
      const breakTraverse = () => {
        this.break()
      }
      switch (node.type) {
        case 'ReturnStatement':
          this.skip()
          onReturn(node.argument, breakTraverse)
          return
        case 'BlockStatement':
        case 'IfStatement':
        case 'ForStatement':
        case 'WhileStatement':
        case 'SwitchStatement':
        case 'SwitchCase':
          return
        default:
          this.skip()
      }
    },
  })
}

/**
 * Gets the first node in a line from the initial node, excluding whitespace.
 * @param {object} context The node to check
 * @param {ASTNode} node The node to check
 * @return {ASTNode} the first node in the line
 */
export function getFirstNodeInLine(context: Rule.RuleContext, node: ESNode) {
  const sourceCode = context.getSourceCode()
  let token: ESNode | AST.Token = node
  let lines: string[] | null = null
  do {
    token = sourceCode.getTokenBefore(token)!
    lines = token.type === 'JSXText'
      ? token.value.split('\n')
      : null
  } while (
    token.type === 'JSXText' && lines && /^\s*$/.test(lines[lines.length - 1])
  )
  return token
}

/**
 * Checks if the node is the first in its line, excluding whitespace.
 * @param {object} context The node to check
 * @param {ASTNode} node The node to check
 * @return {boolean} true if it's the first node in its line
 */
export function isNodeFirstInLine(context: Rule.RuleContext, node: ESNode) {
  const token = getFirstNodeInLine(context, node)
  const startLine = node.loc!.start.line
  const endLine = token ? token.loc.end.line : -1
  return startLine !== endLine
}

/**
 * Checks if a node is surrounded by parenthesis.
 *
 * @param {object} context - Context from the rule
 * @param {ASTNode} node - Node to be checked
 * @returns {boolean}
 */
export function isParenthesized(context: TSESLint.RuleContext<any, any>, node: ASTNode): boolean {
  const sourceCode = context.getSourceCode()
  const previousToken = sourceCode.getTokenBefore(node)
  const nextToken = sourceCode.getTokenAfter(node)

  return !!previousToken && !!nextToken
    && previousToken.value === '(' && previousToken.range[1] <= node.range![0]
    && nextToken.value === ')' && nextToken.range[0] >= node.range![1]
}
