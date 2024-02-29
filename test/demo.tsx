import { lang } from "@/i18n";
import React, { useEffect } from "react";
import { Dialog, useDialog } from "@/components/Dialog";
import BackArrow from "@/components/BackArrow";
import CountDown from "@/components/CountDown";
import Layout from "@/layout";
import { PHONE } from "@/config";
import Switcher from "./Switch";
import styles from "./index.module.scss";
const Index = () => {
  const {
    on,
    show,
    hide
  } = useDialog();
  useEffect(() => {
    show();
  }, []);
  return <>
      <div className={styles.icon} onClick={show}>
        index
      </div>
      <Dialog custom show={on}>
        <Layout hideFigure>
          <BackArrow fixed onBack={hide}>
            <CountDown time={30} template="*s" timeCallback={() => {
            hide();
          }} clickReset />
          </BackArrow>

          <div className={styles.content}>
            <div className={styles.wrapper}>
              <div className={styles.tip}>{lang("非工作人员在非紧急情况下擅自关闭，需承担相应责任")}</div>

              <div className={styles.power}>
                <div className={styles.power_label}>{lang("动力开关:")}</div>
                <div className={styles.power_switch}>
                  <Switcher />
                </div>
              </div>
              <div className={styles.describe}>{lang("关闭此开关，可让机器人停止自主行驶，方便在屏幕上进行操作")}</div>
            </div>
            <div className={styles.call}>{lang("客服电话：")}{PHONE}</div>
          </div>
        </Layout>
      </Dialog>
    </>;
};
export default Index;