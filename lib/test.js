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
const t = __importStar(require("@babel/types"));
const core_1 = __importDefault(require("@babel/core"));
const glob_1 = require("glob");
const includeSpace = (v) => /[\f\r\t\n\s]/.test(v);
const includesChinese = (v) => /^[\u4e00-\u9fa5]+/g.test(v);
const extractChinese = (str) => str.match(/[\u4e00-\u9fa5]+/g);
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield (0, glob_1.glob)(path_1.default.resolve(process.cwd(), "test/**/*.{js,ts,tsx}"), {
        ignore: "node_modules/**",
    });
    files.forEach((src) => {
        var code = fs_1.default.readFileSync(src, "utf8");
        const { code: es5Code } = core_1.default.transformFromAstSync(code, null, {
            presets: ["@babel/preset-env"],
        });
        console.log(es5Code);
        return;
        var ast = parser.parse(es5Code, {
            sourceType: "module", // default: "script"
            plugins: ["typescript", "jsx"],
        });
        (0, traverse_1.default)(ast, {
            // TemplateElement
            StringLiteral(path) {
                var _a, _b;
                const { node, parent } = path;
                const nodeValue = (_b = (_a = path.node.value) === null || _a === void 0 ? void 0 : _a.replace(/^[\n ]+/, "")) === null || _b === void 0 ? void 0 : _b.replace(/[\n ]+$/, "");
                if (includesChinese(node.value)) {
                    const tCallExpression = t.callExpression(t.identifier("t"), [
                        t.stringLiteral(nodeValue),
                    ]);
                    if (t.isJSXAttribute(parent)) {
                        // <Input placeholder='请输入你的年龄' /> => <Input placeholder={t('请输入你的年龄')} />
                        // 按说应该这么写 path.replaceWith(t.jsxExpressionContainer(t.callExpression(t.identifier('t'),[t.stringLiteral(node.value)])))
                        // 但是结果是 <Input placeholder={t(t("请输入你的年龄"))} />
                        // 明显被下边的逻辑重复处理了所以可以简单点。只处理成字符串,再经过下边逻辑时就变成我们想要的结果
                        // path.replaceWith(
                        //   t.jsxExpressionContainer(t.stringLiteral(node.value))
                        // );
                        path.replaceWith(t.jSXExpressionContainer(tCallExpression));
                        return;
                    }
                    else {
                        path.replaceWith(tCallExpression);
                    }
                }
                path.skip();
            },
            JSXText(path) {
                const { node, parent } = path;
                const { value } = node;
                if (includesChinese(node.value)) {
                    if (!includeSpace(node.value)) {
                        path.replaceWith(t.jsxExpressionContainer(t.stringLiteral(node.value)));
                        return;
                    }
                    else {
                        const newAstNode = [];
                        let chineseArr = extractChinese(node.value);
                        chineseArr.forEach((str) => {
                            let preIndex = node.value.indexOf(str);
                            newAstNode.push(t.jSXText(node.value.slice(0, preIndex)));
                            newAstNode.push(t.jsxExpressionContainer(t.stringLiteral(str)));
                        });
                        path.replaceWithMultiple(newAstNode);
                        return;
                        // console.log(value.length, value.replace(/[\u4e00-\u9fa5]+/,function(value){return `{t('${value}')}`}) )
                        // path.replaceWithSourceString(value.replace(/[\u4e00-\u9fa5]+/,function(value){return `{t('${value}')}`}))
                    }
                }
                path.skip();
            },
            // 模版字符串
            TemplateLiteral: function (path) {
                const { node } = path;
                // expressions 表达式
                // quasis 表示表达式中的间隙字符串, 每个表达式中间都必须有quasis, 同时首尾也必须是quasis,其中末尾元素需要是tail = true
                // 其中 quasis: {
                //    value: 值, 如果为‘’,一般表示给表达式的占位符
                //     tail: 是否为末尾
                // }
                const { expressions, quasis } = node;
                // todo 获取所有quasis中value 不为空和数字的, 如果不为末尾,记录前面有几个''
                // 生成函数, 插入expressions数组中, 修改quasis节点value为空
                // 如果字符串为最后一个节点,还需要生成一个空白的节点
                console.log(expressions, quasis);
            },
            // ReturnStatement(path) {
            //   const { node, parent, parentPath } = path;
            //   const { body } = parent;
            //   body.unshift(
            //     parser.parse("const { t } = useTranslation()").program.body[0]
            //   );
            // },
            Program(path) {
                const { node } = path;
                const { body } = node;
                body.unshift(parser.parse("import { useTranslation } from 'react-i18next'", {
                    sourceType: "module",
                }).program.body[0]);
            },
        });
        // console.log(generator(ast).code);
        // fs.writeFileSync(
        //   src,
        //   generator(ast, { jsescOption: { minimal: true } }, code).code,
        //   "utf-8"
        // );
    });
});
main();
//# sourceMappingURL=test.js.map