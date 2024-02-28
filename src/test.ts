import fs from "fs";
import path from "path";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generator from "@babel/generator";
import * as t from "@babel/types";
import babel from "@babel/core";
import { glob } from "glob";

const includeSpace = (v) => /[\f\r\t\n\s]/.test(v);
const includesChinese = (v) => /^[\u4e00-\u9fa5]+/g.test(v);
const extractChinese = (str) => str.match(/[\u4e00-\u9fa5]+/g);

const main = async () => {
  const files = await glob(
    path.resolve(process.cwd(), "test/**/*.{js,ts,tsx}"),
    {
      ignore: "node_modules/**",
    }
  );
  files.forEach((src) => {
    var code = fs.readFileSync(src, "utf8");

    const { code: es5Code } = babel.transformFromAstSync(code, null, {
      presets: ["@babel/preset-env"],
    });

    console.log(es5Code);

    return
    
    var ast = parser.parse(es5Code, {
      sourceType: "module", // default: "script"
      plugins: ["typescript", "jsx"],
    });

    traverse(ast, {
      // TemplateElement

      StringLiteral(path) {
        const { node, parent } = path;
        const nodeValue = path.node.value
          ?.replace(/^[\n ]+/, "")
          ?.replace(/[\n ]+$/, "");

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
          } else {
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
            path.replaceWith(
              t.jsxExpressionContainer(t.stringLiteral(node.value))
            );
            return;
          } else {
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

        body.unshift(
          parser.parse("import { useTranslation } from 'react-i18next'", {
            sourceType: "module",
          }).program.body[0]
        );
      },
    });

    // console.log(generator(ast).code);

    // fs.writeFileSync(
    //   src,
    //   generator(ast, { jsescOption: { minimal: true } }, code).code,
    //   "utf-8"
    // );
  });
};

main();
