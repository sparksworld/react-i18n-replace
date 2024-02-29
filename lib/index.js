"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const generator_1 = __importDefault(require("@babel/generator"));
const t = __importStar(require("@babel/types"));
const glob_1 = require("glob");
const utils_1 = require("./utils");
const identifier = "lang";
const importLibrary = "react-i18next";
const importFunctions = ["lang", "useTranslation"];
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield (0, glob_1.glob)(path_1.default.resolve(process.cwd(), "test/**/*.{js,ts,tsx}"), {
        ignore: "node_modules/**",
    });
    files.forEach((src) => {
        var code = fs_1.default.readFileSync(src, "utf8");
        // const { code: es5Code } = babel.transformSync(code, {
        //   presets: ["@babel/preset-env"],
        // });
        var ast = parser.parse(code, {
            sourceType: "module",
            plugins: ["typescript", "jsx"],
        });
        (0, traverse_1.default)(ast, {
            JSXText(path) {
                var _a, _b;
                const value = (_b = (_a = path.node.value) === null || _a === void 0 ? void 0 : _a.replace(/^[\n]+/, "")) === null || _b === void 0 ? void 0 : _b.replace(/[\n]+$/, "");
                if ((0, utils_1.hasChineseCharacters)(value)) {
                    path.replaceWith(t.jsxExpressionContainer(t.callExpression(t.identifier(identifier), [
                        t.stringLiteral(value),
                    ])));
                }
            },
            JSXAttribute(path) {
                if (t.isJSXAttribute(path.node)) {
                    if (t.isJSXIdentifier(path.node.name) &&
                        t.isStringLiteral(path.node.value)) {
                        if ((0, utils_1.hasChineseCharacters)(path.node.value.value)) {
                            path.replaceWith(t.jsxAttribute(t.jsxIdentifier(path.node.name.name), t.jsxExpressionContainer(t.callExpression(t.identifier(identifier), [
                                path.node.value,
                            ]))));
                        }
                    }
                }
            },
        });
        (0, traverse_1.default)(ast, {
            StringLiteral(path) {
                if (path.isImportDeclaration())
                    return;
                if ((0, utils_1.hasChineseCharacters)(path.node.value)) {
                    if (t.isCallExpression(path.parent) &&
                        t.isIdentifier(path.parent.callee)) {
                        if (path.parent.callee.name !== identifier) {
                            path.replaceWith(t.callExpression(t.identifier(identifier), [path.node]));
                        }
                    }
                    else {
                        path.replaceWith(t.callExpression(t.identifier(identifier), [path.node]));
                    }
                }
            },
            // TemplateLiteral
            TemplateLiteral(path) {
                var _a, _b, _c;
                const originalString = path.toString();
                if (!(0, utils_1.hasChineseCharacters)(originalString))
                    return;
                const { expressions, quasis } = path.node;
                const stringsList = [];
                for (let i = 0; i < quasis.length; i++) {
                    const quasi = quasis[i];
                    stringsList.push(quasi.value.raw);
                    if (i < expressions.length) {
                        stringsList.push(`{{${(_c = (_b = (_a = expressions[i]) === null || _a === void 0 ? void 0 : _a.loc) === null || _b === void 0 ? void 0 : _b.identifierName) !== null && _c !== void 0 ? _c : i}}}`);
                    }
                }
                const codes = t.callExpression(t.identifier(identifier), [
                    t.stringLiteral(stringsList.join("")),
                    expressions.length > 0
                        ? (0, utils_1.removeDuplicateKeysFromObjectExpression)(t.objectExpression(expressions.map((item, index) => {
                            var _a;
                            return t.objectProperty(t.identifier(`${(_a = item.loc.identifierName) !== null && _a !== void 0 ? _a : index}`), item, false, true);
                        })))
                        : null,
                ].filter(Boolean));
                path.replaceWith(codes);
            },
        });
        // 是否需要添加hooks???
        (0, traverse_1.default)(ast, {
            "FunctionDeclaration|ArrowFunctionExpression"(path) {
                let funcComponent = false;
                let identifierExist = false;
                path.traverse({
                    JSXElement(path) {
                        const { node } = path;
                        if (t.isJSXElement(node)) {
                            funcComponent = true;
                        }
                    },
                    CallExpression(path) {
                        const { node } = path;
                        if (t.isIdentifier(path.node.callee)) {
                            if (path.node.callee.name == identifier) {
                                identifierExist = true;
                            }
                        }
                    },
                });
                if (funcComponent && identifierExist) {
                    const { node } = path;
                    const statement = t.variableDeclaration("const", [
                        t.variableDeclarator(t.objectPattern([
                            t.objectProperty(t.identifier(identifier), t.identifier(identifier), false, true),
                        ]), t.callExpression(t.identifier("useTranslation"), [])),
                    ]);
                    if (t.isArrowFunctionExpression(node)) {
                        if (t.isBlockStatement(node.body)) {
                            const jsxElements = node.body.body.filter((node) => t.isJSXElement(node));
                            if (!(0, utils_1.checkVariableExistsInFunction)(node, identifier)) {
                                node.body.body.unshift(statement);
                            }
                        }
                        else {
                            node.body = t.blockStatement([
                                statement,
                                t.returnStatement(node.body),
                            ]);
                        }
                    }
                    if (t.isFunctionDeclaration(node)) {
                        if (!(0, utils_1.checkVariableExistsInFunction)(node, identifier)) {
                            node.body.body.unshift(statement);
                        }
                    }
                }
            },
        });
        (0, traverse_1.default)(ast, {
            Program(path) {
                let importedNode;
                let importFunc = [];
                const { node } = path;
                const { body } = node;
                path.traverse({
                    ImportDeclaration(path) {
                        const { node } = path;
                        if (node.source.value === importLibrary) {
                            importedNode = node;
                        }
                    },
                    CallExpression(path) {
                        const { node } = path;
                        if (t.isIdentifier(node.callee)) {
                            if (importFunctions.includes(node.callee.name)) {
                                importFunc = [...new Set(importFunc.concat(node.callee.name))];
                            }
                        }
                    },
                    Identifier(path) {
                        const { node } = path;
                        if (importFunctions.includes(node.name)) {
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
                }
                else {
                    const useTranslationImport = t.importDeclaration(importFunc.map((func) => t.importSpecifier(t.identifier(func), t.identifier(func))), t.stringLiteral(importLibrary));
                    // lastImport.insertAfter(useTranslationImport)
                    body.unshift(useTranslationImport);
                }
            },
        });
        fs_1.default.writeFileSync(src, (0, generator_1.default)(ast, { jsescOption: { minimal: true } }, code).code, "utf-8");
    });
});
main();
//# sourceMappingURL=index.js.map