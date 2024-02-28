import fs from "fs";
import path from "path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generator from "@babel/generator";
import * as t from "@babel/types";
import { glob } from "glob";
import * as babel from "@babel/core";
import * as _ from "lodash";
import {
  checkVariableExistsInFunction,
  hasChineseCharacters,
  removeDuplicateKeysFromObjectExpression,
} from "./utils";

// 检查是否已引入 i18n 中的 t 方法

const identifier = "lang";

const main = async () => {
  const files = await glob(
    path.resolve(process.cwd(), "test/**/*.{js,ts,tsx}"),
    {
      ignore: "node_modules/**",
    }
  );
  files.forEach((src) => {
    var code = fs.readFileSync(src, "utf8");

    // const { code: es5Code } = babel.transformSync(code, {
    //   presets: ["@babel/preset-env"],
    // });

    var ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    let hasTMethodImport = false;

    traverse(ast, {
      // ImportDeclaration(path) {
      //   const { node } = path;
      //   if (node.source.value === "react-i18next") {
      //     const importedT = node.specifiers.find((specifier) => {
      //       if (t.isImportSpecifier(specifier)) {
      //         if (t.isIdentifier(specifier.imported)) {
      //           return specifier.imported.name === "useTranslation";
      //         }
      //       }
      //     });
      //     if (importedT) {
      //       hasTMethodImport = true;
      //     }
      //   }
      // },
      // "FunctionDeclaration|ArrowFunctionExpression"(path) {
      //   const { node } = path;

      //   const statement = t.variableDeclaration("const", [
      //     t.variableDeclarator(
      //       t.objectPattern([
      //         t.objectProperty(
      //           t.identifier(identifier),
      //           t.identifier(identifier),
      //           false,
      //           true
      //         ),
      //       ]),
      //       t.callExpression(t.identifier("useTranslation"), [])
      //     ),
      //   ]);

      //   if (t.isArrowFunctionExpression(node)) {
      //     if (t.isBlockStatement(node.body)) {
      //       const jsxElements = node.body.body.filter((node) =>
      //         t.isJSXElement(node)
      //       );

      //       if (!checkVariableExistsInFunction(node, identifier)) {
      //         node.body.body.unshift(statement);
      //       }
      //     } else {
      //       node.body = t.blockStatement([
      //         statement,
      //         t.returnStatement(node.body),
      //       ]);
      //     }
      //   }

      //   if (t.isFunctionDeclaration(node)) {
      //     if (!checkVariableExistsInFunction(node, identifier)) {
      //       node.body.body.unshift(statement);
      //     }
      //   }
      // },
      JSXText(path) {
        const value = path.node.value
          ?.replace(/^[\n ]+/, "")
          ?.replace(/[\n ]+$/, "");

        if (hasChineseCharacters(value)) {
          path.replaceWith(
            t.jsxExpressionContainer(
              t.callExpression(t.identifier(identifier), [
                t.stringLiteral(value),
              ])
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
                    t.callExpression(t.identifier(identifier), [
                      path.node.value,
                    ])
                  )
                )
              );
            }
          }
        }
      },
    });

    traverse(ast, {
      StringLiteral(path) {
        if (path.isImportDeclaration()) return;

        if (hasChineseCharacters(path.node.value)) {
          if (
            t.isCallExpression(path.parent) &&
            t.isIdentifier(path.parent.callee)
          ) {
            if (path.parent.callee.name !== identifier) {
              path.replaceWith(
                t.callExpression(t.identifier(identifier), [path.node])
              );
            }
          } else {
            path.replaceWith(
              t.callExpression(t.identifier(identifier), [path.node])
            );
          }
        }

        // path.skip();
      },
      // TemplateLiteral
      TemplateLiteral(path) {
        const originalString = path.toString();
        if (!hasChineseCharacters(originalString)) return;
        const { expressions, quasis } = path.node;
        const stringsList = [];

        for (let i = 0; i < quasis.length; i++) {
          const quasi = quasis[i];
          stringsList.push(quasi.value.raw);
          if (i < expressions.length) {
            stringsList.push(`{{${expressions[i]?.loc?.identifierName}}}`);
          }
        }

        const codes = t.callExpression(
          t.identifier(identifier),
          [
            t.stringLiteral(stringsList.join("")),
            expressions.length > 0
              ? removeDuplicateKeysFromObjectExpression(
                  t.objectExpression(
                    expressions.map((item) =>
                      t.objectProperty(
                        t.identifier(item.loc.identifierName),
                        t.identifier(item.loc.identifierName),
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

      Program(path) {
        let importedNode;
        // let lastImport;
        const { node } = path;
        const { body } = node;

        path.traverse({
          ImportDeclaration(path) {
            const { node } = path;
            if (node.source.value === "react-i18next") {
              importedNode = node;
            }
            // lastImport = path;
          },
        });

        if (importedNode) {
          const has = importedNode.specifiers.find((specifier) => {
            if (t.isImportSpecifier(specifier)) {
              if (t.isIdentifier(specifier.imported)) {
                return specifier.imported.name === "useTranslation";
              }
            }
          });
          if (!has) {
            importedNode.specifiers.push(t.identifier("useTranslation"));
          }
        } else {
          const useTranslationImport = t.importDeclaration(
            [
              t.importSpecifier(
                t.identifier("useTranslation"),
                t.identifier("useTranslation")
              ),
            ],
            t.stringLiteral("react-i18next")
          );
          // lastImport.insertAfter(useTranslationImport)
          body.unshift(useTranslationImport);
        }
      },
    });

    fs.writeFileSync(
      src,
      generator(ast, { jsescOption: { minimal: true } }, code).code,
      "utf-8"
    );
  });
};

main();
