import { lang } from "@/i18n";
import React from "react";
const s = lang('() => "测试1"');
const t = () => lang("测试");
const y = "dwadwa";
interface IProps {}
export default function (props: IProps) {
  const test = lang("{{s}}}哇", {
    s
  });
  return <div>hello</div>;
}