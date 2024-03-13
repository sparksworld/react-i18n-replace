import * as t from "@babel/types";
import traverse from "@babel/traverse";
import {
  hasChineseCharacters,
  removeDuplicateKeysFromObjectExpression,
} from "./utils";

export default (ast, args) => {
  const wrapped = args["wd"];
  const importLibrary = args["impLib"];
  const importFunctions =
    typeof args["impFuncs"] == "string" ? [args["impFuncs"]] : args["impFuncs"];

  traverse(ast, {
    JSXText(path) {
      const value = path.node.value
        ?.replace(/^[\n ]+/, "")
        ?.replace(/[\n ]+$/, "");
      if (hasChineseCharacters(value)) {
        path.replaceWith(
          t.jsxExpressionContainer(
            t.callExpression(t.identifier(wrapped), [t.stringLiteral(value)])
          )
        );
      }
    },
    JSXAttribute(path) {
      if (t.isJSXAttribute(path.node)) {
        if (
          t.isJSXIdentifier(path.node.name) &&
          t.isStringLiteral(path.node.value)
        ) {
          if (hasChineseCharacters(path.node.value.value)) {
            path.replaceWith(
              t.jsxAttribute(
                t.jsxIdentifier(path.node.name.name),
                t.jsxExpressionContainer(
                  t.callExpression(t.identifier(wrapped), [path.node.value])
                )
              )
            );
          }
        }
      }
    },
  });

  traverse(ast, {
    TSEnumMember(path) {
      path.skip();
    },
    StringLiteral(path) {
      if (path.isImportDeclaration()) return;

      if (hasChineseCharacters(path.node.value)) {
        if (
          t.isCallExpression(path.parent) &&
          t.isIdentifier(path.parent.callee)
        ) {
          if (path.parent.callee.name !== wrapped) {
            path.replaceWith(
              t.callExpression(t.identifier(wrapped), [path.node])
            );
          }
        } else {
          path.replaceWith(
            t.callExpression(t.identifier(wrapped), [path.node])
          );
        }
      }
    },
    // TemplateLiteral
    TemplateLiteral(path) {
      const originalString = path.toString();
      if (!hasChineseCharacters(originalString)) return path.skip();
      if (
        t.isCallExpression(path.parent) &&
        t.isIdentifier(path.parent.callee)
      ) {
        if (path.parent.callee.name === wrapped) return path.skip();
      }

      const { expressions, quasis } = path.node;
      const stringsList = [];
      for (let i = 0; i < quasis.length; i++) {
        const quasi = quasis[i];
        stringsList.push(quasi.value.raw);
        if (i < expressions.length) {
          stringsList.push(`{{${expressions[i]?.loc?.identifierName ?? i}}}`);
        }
      }
      const codes = t.callExpression(
        t.identifier(wrapped),
        [
          t.stringLiteral(stringsList.join("")),
          expressions.length > 0
            ? removeDuplicateKeysFromObjectExpression(
                t.objectExpression(
                  expressions.map((item, index) =>
                    t.objectProperty(
                      t.identifier(`${item.loc.identifierName ?? index}`),
                      item as any,
                      false,
                      true
                    )
                  )
                )
              )
            : null,
        ].filter(Boolean)
      );
      path.replaceWith(codes);
    },
  });

  // 是否需要添加hooks???
  // traverse(ast, {
  //   "FunctionDeclaration|ArrowFunctionExpression"(path) {
  //     let funcComponent = false;
  //     let identifiers = [];

  //     path.traverse({
  //       JSXElement(path) {
  //         const { node } = path;
  //         if (t.isJSXElement(node)) {
  //           funcComponent = true;
  //         }
  //       },
  //       CallExpression(path) {
  //         if (t.isIdentifier(path.node.callee)) {
  //           if (hook.name.includes(path.node.callee.name)) {
  //             identifiers = [
  //               ...new Set(identifiers.concat(path.node.callee.name)),
  //             ];
  //           }
  //         }
  //       },
  //     });

  //     if (funcComponent && identifiers.length > 0) {
  //       const { node } = path;
  //       const statement = t.variableDeclaration("const", [
  //         t.variableDeclarator(
  //           t.objectPattern(
  //             identifiers.map((identifier) =>
  //               t.objectProperty(
  //                 t.identifier(identifier),
  //                 t.identifier(identifier),
  //                 false,
  //                 true
  //               )
  //             )
  //           ),
  //           t.callExpression(t.identifier(hook.name), [])
  //         ),
  //       ]);
  //       if (t.isArrowFunctionExpression(node)) {
  //         if (t.isBlockStatement(node.body)) {
  //           if (!checkVariableExistsInFunction(node, identifier)) {
  //             node.body.body.unshift(statement);
  //           }
  //         } else {
  //           node.body = t.blockStatement([
  //             statement,
  //             t.returnStatement(node.body),
  //           ]);
  //         }
  //       }
  //       if (t.isFunctionDeclaration(node)) {
  //         if (!checkVariableExistsInFunction(node, identifier)) {
  //           node.body.body.unshift(statement);
  //         }
  //       }
  //     }
  //   },
  // });

  traverse(ast, {
    Program(path) {
      let importedNode;
      let hasLangVariable = false;
      let importFunc = [];
      const { node } = path;
      const { body } = node;
      const importedIdentifiers = new Map();

      path.traverse({
        VariableDeclarator(path) {
          if (t.isIdentifier(path.node.id)) {
            if (path.node.id.name === wrapped) {
              hasLangVariable = true;
            }
          }
        },
        ImportDeclaration(path) {
          const { node } = path;
          const source = node.source.value;

          if (importedIdentifiers.has(source)) {
            path.remove();
            const specifiers = importedIdentifiers.get(source);

            importedIdentifiers.set(source, [
              ...new Set(specifiers.concat(node.specifiers)),
            ]);

            const findImportSource = ast.program.body.find(
              (node) =>
                t.isImportDeclaration(node) && node.source.value === source
            );

            if (t.isImportDeclaration(findImportSource)) {
              findImportSource.specifiers = importedIdentifiers.get(source);
            }
          } else {
            importedIdentifiers.set(source, node.specifiers);
          }

          if (source === importLibrary) {
            importedNode = node;
          }
        },

        CallExpression(path) {
          const { node } = path;

          const flag = path.findParent((p) => {
            if (t.isVariableDeclarator(p.node)) {
              if (t.isIdentifier(p.node.id)) {
                if (importFunctions.includes(p.node.id.name)) {
                  return true;
                }
              }
            }
          });

          if (t.isIdentifier(node.callee)) {
            if (importFunctions.includes(node.callee.name) && !flag) {
              importFunc = [...new Set(importFunc.concat(node.callee.name))];
            }
          }
        },

        Identifier(path) {
          const { node } = path;
          const flag = path.findParent((p) => {
            if (t.isVariableDeclarator(p.node)) {
              if (t.isIdentifier(p.node.id)) {
                if (importFunctions.includes(p.node.id.name)) {
                  return true;
                }
              }
            }
          });

          if (importFunctions.includes(node.name) && !flag) {
            importFunc = [...new Set(importFunc.concat(node.name))];
          }
        },
      });

      if (importedNode) {
        importFunc.forEach((func) => {
          const has = importedNode.specifiers.find((specifier) => {
            if (t.isImportSpecifier(specifier)) {
              if (t.isIdentifier(specifier.imported)) {
                return specifier.imported.name === func;
              }
            }
          });
          if (!has) {
            importedNode.specifiers.push(t.identifier(func));
          }
        });
      } else {
        importFunc.length > 0 &&
          !hasLangVariable &&
          body.unshift(
            t.importDeclaration(
              importFunc.map((func) =>
                t.importSpecifier(t.identifier(func), t.identifier(func))
              ),
              t.stringLiteral(importLibrary)
            )
          );
      }
    },
  });

  return ast;
};
