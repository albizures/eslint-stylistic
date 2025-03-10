/**
 * @fileoverview Validates newlines before and after dots
 * @author Greg Cochard
 */

import { isDecimalIntegerNumericToken, isTokenOnSameLine } from '../../utils/ast-utils'
import { createRule } from '../../utils/createRule'
import type { Tree } from '../../utils/types'

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

export default createRule({
  meta: {
    type: 'layout',

    docs: {
      description: 'Enforce consistent newlines before and after dots',
      url: 'https://eslint.style/rules/js/dot-location',
    },

    schema: [
      {
        type: 'string',
        enum: ['object', 'property'],
      },
    ],

    fixable: 'code',

    messages: {
      expectedDotAfterObject: 'Expected dot to be on same line as object.',
      expectedDotBeforeProperty: 'Expected dot to be on same line as property.',
    },
  },

  create(context) {
    const config = context.options[0]

    // default to onObject if no preference is passed
    const onObject = config === 'object' || !config

    const sourceCode = context.sourceCode

    /**
     * Reports if the dot between object and property is on the correct location.
     * @param {ASTNode} node The `MemberExpression` node.
     * @returns {void}
     */
    function checkDotLocation(node: Tree.MemberExpression) {
      const property = node.property
      const dotToken = sourceCode.getTokenBefore(property)

      if (onObject && dotToken) {
        // `obj` expression can be parenthesized, but those paren tokens are not a part of the `obj` node.
        const tokenBeforeDot = sourceCode.getTokenBefore(dotToken)

        if (tokenBeforeDot && !isTokenOnSameLine(tokenBeforeDot, dotToken)) {
          context.report({
            node,
            loc: dotToken.loc,
            messageId: 'expectedDotAfterObject',
            *fix(fixer) {
              if (dotToken.value.startsWith('.') && isDecimalIntegerNumericToken(tokenBeforeDot))
                yield fixer.insertTextAfter(tokenBeforeDot, ` ${dotToken.value}`)
              else
                yield fixer.insertTextAfter(tokenBeforeDot, dotToken.value)

              yield fixer.remove(dotToken)
            },
          })
        }
      }
      else if (!isTokenOnSameLine(dotToken, property) && dotToken) {
        context.report({
          node,
          loc: dotToken.loc,
          messageId: 'expectedDotBeforeProperty',
          *fix(fixer) {
            yield fixer.remove(dotToken)
            yield fixer.insertTextBefore(property, dotToken.value)
          },
        })
      }
    }

    /**
     * Checks the spacing of the dot within a member expression.
     * @param {ASTNode} node The node to check.
     * @returns {void}
     */
    function checkNode(node: Tree.MemberExpression) {
      if (node.type === 'MemberExpression' && !node.computed)
        checkDotLocation(node)
    }

    return {
      MemberExpression: checkNode,
    }
  },
})
