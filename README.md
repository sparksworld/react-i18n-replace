## react-i18n-replace

> 一个批量支持国际化方法的脚本

#### 为什么需要这个脚本？

- 项目中没有支持国际化，需要手动将所有字符串替换为国际化方法，此脚本可以自动化替换字符串为国际化方法

#### 脚本做了什么？

> 自动引入项目中的国际化方法

```js
import { t } from "@/i18n"; //@i18n 是一个自定义的路径
```

> jsx代码转换

```jsx
<!-- 转换前 -->
<SelfComp title="测试标题">测试文本</SelfComp>
<!-- 转换后 -->
<SelfComp title={t('测试标题')}>{t('测试文本')}</SelfComp>
```

> 字符串转换

```js
// 转换前
const user = "张三";
// 转换后
const user = t("张三");
```

> 模板字符串转换

```js
const user = "张三";
const age = 18;
// 转换前
const words = `现在时间${Date.now()}, ${user}已经${age}岁了`;
// 转换后
const words = lang("现在时间{{0}}, {{user}}已经{{age}}岁了", {
  0: Date.now(),
  user,
  age,
});

```

#### 安装方式

- 全局安装

```shell
npm i react-i18n-replace -g
# or
yarn add react-i18n-replace -g
```

- 项目安装

```shell
npm i react-i18n-replace --save-dev
# or
yarn add react-i18n-replace --dev
```

#### 脚本选项

> react-i18n-replace [path] [options]

```
path: 以当前终端所在目录为根目录, 示例src, 相当于当前终端目录下的src目录

-wd, --wrapped: 字符串包裹的方法名，示例：t或者lang

-impLib, --importLibrary: 需要导入的包，示例: i18nxt

-impFuncs, --importFunctions: 从impLib需要导入的方法名，需和--wrapped参数保持一致
可多次添加此参数，示例：--impFuncs t --impFuncs useTranslate

-ext, --extension: 需要执行脚本文件的后缀，示例: js,ts,tsx

-ignore, --ignore: 需要忽略的文件夹或文件，示例：node_modules/**
可多次添加此参数，示例：--ignore node_modules/** --ignore **/*.d.ts
```

#### 使用方法

- 全局安装下执行

```
react-i18n-replace src --wd t --impLib @src/i18n --impFuncs t --ext ts,tsx
```

- 项目下安装执行

```
npx react-i18n-replace src --wd t --impLib @src/i18n --impFuncs t --ext ts,tsx
```

> 注：配合[i18next-scanner](https://github.com/i18next/i18next-scanner)搭配使用，效果更佳
