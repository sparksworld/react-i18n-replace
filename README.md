### react-i18n-replace

## Installation

- 全局安装

```shell
npm i react-i18n-replace -g
//or
yarn add react-i18n-replace -g
```

- 项目安装

```shell
npm i react-i18n-replace --save-dev
//or
yarn add react-i18n-replace --dev
```

## Options
```
-wd, --wrapped: 字符串包裹的方法名，示例：t或者lang

-impLib, --importLibrary: 需要导入的包，示例: i18nxt

-impFuncs, --importFunctions: 从impLib需要导入的方法名，需和--wrapped参数保持一致
可多次添加此参数，示例：--impFuncs t --impFuncs useTranslate

-ext, --extension: 需要执行脚本文件的后缀，示例: js,ts,tsx

-ignore, --ignore: 需要忽略的文件夹或文件，示例：node_modules/**
可多次添加此参数，示例：--ignore node_modules/** --ignore **/*.d.ts
```


## Usage

- 全局安装下执行
```
react-i18n-replace --wd t --impLib @src/i18n --impFuncs t --ext ts,tsx
```

- 项目下安装执行
```
npx react-i18n-replace --wd t --impLib @src/i18n --impFuncs t --ext ts,tsx
```