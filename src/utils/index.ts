import * as _ from "lodash";
import * as t from "@babel/types";

export function hasChineseCharacters(str) {
  var pattern = /[\u4e00-\u9fa5]/g; // 中文字符的Unicode范围
  return pattern.test(str);
}
export function removeDuplicateKeysFromObjectExpression(objectExpression) {
  const properties = objectExpression.properties;
  const uniqueProperties = _.uniqBy(
    properties,
    (property) => property.key.name
  );
  return t.objectExpression(uniqueProperties);
}

export function checkVariableExistsInFunction(functionNode, variableName) {
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
