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
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVariableExistsInFunction = exports.removeDuplicateKeysFromObjectExpression = exports.hasChineseCharacters = void 0;
const _ = __importStar(require("lodash"));
const t = __importStar(require("@babel/types"));
function hasChineseCharacters(str) {
    var pattern = /[\u4e00-\u9fa5]/g; // 中文字符的Unicode范围
    return pattern.test(str);
}
exports.hasChineseCharacters = hasChineseCharacters;
function removeDuplicateKeysFromObjectExpression(objectExpression) {
    const properties = objectExpression.properties;
    const uniqueProperties = _.uniqBy(properties, (property) => property.key.name);
    return t.objectExpression(uniqueProperties);
}
exports.removeDuplicateKeysFromObjectExpression = removeDuplicateKeysFromObjectExpression;
function checkVariableExistsInFunction(functionNode, variableName) {
    let flag = false;
    function traverseFunctionBody(body) {
        for (let i = 0; i < body.length; i++) {
            const statement = body[i];
            if (t.isVariableDeclaration(statement)) {
                statement.declarations.forEach((declarator) => {
                    if (t.isObjectPattern(declarator.id)) {
                        declarator.id.properties.forEach((property) => {
                            if (t.isObjectProperty(property)) {
                                if (t.isIdentifier(property.value)) {
                                    if (property.value.name === variableName) {
                                        flag = true;
                                    }
                                }
                            }
                        });
                    }
                    if (t.isVariableDeclarator(declarator)) {
                        if (t.isIdentifier(declarator.id)) {
                            if (declarator.id.name == variableName) {
                                flag = true;
                            }
                        }
                    }
                });
            }
        }
    }
    traverseFunctionBody(functionNode.body.body);
    return flag;
}
exports.checkVariableExistsInFunction = checkVariableExistsInFunction;
//# sourceMappingURL=index.js.map