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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prettier_1 = __importDefault(require("prettier"));
const parser = __importStar(require("@babel/parser"));
const generator_1 = __importDefault(require("@babel/generator"));
const glob_1 = require("glob");
const minimist_1 = __importDefault(require("minimist"));
const traverse_1 = __importDefault(require("./traverse"));
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
const args = (0, minimist_1.default)(process.argv.slice(2), options);
const dir = (_a = args === null || args === void 0 ? void 0 : args._) === null || _a === void 0 ? void 0 : _a[0];
if (!dir) {
    console.error(`缺失path参数, 请检查命令是否完整`);
    process.exit(0);
}
const required = ["wd", "impLib", "impFuncs", "ext"];
for (let i = 0; i < required.length; i++) {
    const option = required[i];
    if (!args[option]) {
        console.error(`缺失${option}参数,请检查命令是否完整`);
        process.exit(1);
    }
}
const commandDescriptions = {
    v: "显示版本号",
    wd: "字符串包裹的方法名，示例：t或者lang",
    impLib: "需要导入的包，示例: i18nxt",
    impFuncs: "从impLib需要导入的方法名，需和--wrapped参数保持一致\n可多次添加此参数，示例：--impFuncs t --impFuncs useTranslate",
    ext: "需要执行脚本文件的后缀，示例: js,ts,tsx",
    ignore: "需要忽略的文件夹或文件，示例：node_modules/**\n可多次添加此参数，示例：--ignore node_modules/** --ignore **/*.d.ts",
};
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const prettierConfig = (yield prettier_1.default.resolveConfig(path_1.default.resolve(process.cwd(), dir !== null && dir !== void 0 ? dir : "."))) ||
        {};
    const files = yield (0, glob_1.glob)(path_1.default.resolve(process.cwd(), `${dir}/**/*.{${args.ext}}`), {
        ignore: (_b = args.ignore) !== null && _b !== void 0 ? _b : ["node_modules/**", "**/*.d.ts"],
    });
    for (let i = 0; i < files.length; i++) {
        const src = files[i];
        var code = fs_1.default.readFileSync(src, "utf8");
        // const parsedPath = path.parse(src);
        console.log(`处理文件:${src}`);
        var ast = parser.parse(code, {
            sourceType: "module",
            plugins: ["typescript", "jsx"],
        });
        const traverseAst = (0, traverse_1.default)(ast, args);
        const astCode = (0, generator_1.default)(traverseAst, {
            retainLines: true,
            jsescOption: {
                minimal: true,
            },
            code,
        }).code;
        const formatCode = prettier_1.default.format(astCode, Object.assign({ parser: "typescript" }, prettierConfig));
        fs_1.default.writeFileSync(src, yield formatCode, "utf-8");
    }
});
if (args.help) {
    for (const key in commandDescriptions) {
        console.log(`-${key}, --${options.alias[key] || key}: ${commandDescriptions[key]}\n`);
    }
}
else {
    main();
}
//# sourceMappingURL=index.js.map