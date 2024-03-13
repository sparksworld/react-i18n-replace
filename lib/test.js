"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const prettier_1 = __importDefault(require("prettier"));
console.log(process.cwd());
prettier_1.default.resolveConfig(path_1.default.resolve(process.cwd(), 'src')).then((res) => {
    console.log(res);
});
//# sourceMappingURL=test.js.map