import * as _ from 'lodash'
import * as t from '@babel/types'
export function hasChineseCharacters(str) {
  var pattern = /[\u4e00-\u9fa5]/g // 中文字符的Unicode范围
  return pattern.test(str)
}
export function removeDuplicateKeysFromObjectExpression(objectExpression) {
  const properties = objectExpression.properties
  const uniqueProperties = _.uniqBy(properties, (property) => property.key.name)
  return t.objectExpression(uniqueProperties)
}
