import fs from "fs";
import path from "path";
import prettier from "prettier";
import * as parser from "@babel/parser";
import generator from "@babel/generator";
import { glob } from "glob";
import minimist from "minimist";

import traverse from "./traverse";

const options = {
  default: {
    help: false,
  },
  boolean: ["help"],
  alias: {
    wd: "wrapped",
    impLib: "importLibrary",
    impFuncs: "importFunctions",
    ext: "extension",
    ignore: "ignore",
  },
};
const args = minimist(process.argv.slice(2), options);

const commandDescriptions = {
  v: "显示版本号",
  wd: "字符串包裹的方法名，示例：t或者lang",
  impLib: "需要导入的包，示例: i18nxt",
  impFuncs:
    "从impLib需要导入的方法名，需和--wrapped参数保持一致\n可多次添加此参数，示例：--impFuncs t --impFuncs useTranslate",
  ext: "需要执行脚本文件的后缀，示例: js,ts,tsx",
  ignore:
    "需要忽略的文件夹或文件，示例：node_modules/**\n可多次添加此参数，示例：--ignore node_modules/** --ignore **/*.d.ts",
};

const main = async () => {
  const prettierConfig = (await prettier.resolveConfig(process.cwd())) || {};
  const files = await glob(path.resolve(process.cwd(), `**/*.{${args.ext}}`), {
    ignore: args.ignore ?? ["node_modules/**", "**/*.d.ts"],
  });

  for (let i = 0; i < files.length; i++) {
    const src = files[i];
    var code = fs.readFileSync(src, "utf8");

    // const parsedPath = path.parse(src);

    console.log(`处理文件:${src}`);

    var ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    const traverseAst = traverse(ast, args);

    const astCode = generator(traverseAst, {
      retainLines: true,
      jsescOption: {
        minimal: true,
      },
      code,
    }).code;

    const formatCode = prettier.format(astCode, {
      parser: "typescript",
      ...prettierConfig,
    });

    fs.writeFileSync(src, await formatCode, "utf-8");
  }
};

if (args.help) {
  for (const key in commandDescriptions) {
    console.log(
      `-${key}, --${options.alias[key] || key}: ${commandDescriptions[key]}\n`
    );
  }
} else {
  main();
}
