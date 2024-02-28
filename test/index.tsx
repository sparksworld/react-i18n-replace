/*
 * @Author: spark
 * @Date: 2022-03-23 10:37:11
 * @LastEditTime: 2024-02-28 18:30:00
 * @LastEditors: spark
 * email: spark.xiaoyu@qq.com
 */
import React from "react";
import { observer } from "mobx-react";
import classNames from "classnames";
import { isEqual } from "lodash";
import Layout from "@/layout";
import router from "@/router";
import { BASE_ROUTER, EVENT_NAME, PackagePickupOpenCabinetEventReason, ROUTER_PATH, UIEVENT_NAME } from "@/constant";
import { useEffect, useMemo, useRef, useState } from "react";
import { deliveryInfo, robotInfo, roleInfo, siteInfo, taskInfo, uiInfo, unmanned } from "@/model";
import { EntityType, ICabinetStatus, PackageType, QrcodeType } from "@/types";
import { dateFormat } from "@/utils";
import { useLang } from "@/i18n";
import robot from "@/device";
import Scalable from "@/components/Scalable";
import Button from "@/components/Button";
import { showPasswordVerify } from "@/components/Password";
import audio from "@/common/audio";
import remoteOpen from "../../remote-open";
import styles from "./index.module.scss";
import { useTranslation } from "react-i18next";
interface IProps {}
function useCampare(value, compare) {
  const ref = useRef(null);
  if (!compare(value, ref.current)) {
    ref.current = value;
  }
  return ref.current;
}
export const ExpressNetWorkPickupWaiting = observer((_: IProps) => {
  const lang = useLang();
  const {
    cabinets
  } = robotInfo.data;
  const {
    estimate_end_timestamp
  } = taskInfo.data;
  const {
    waiting_opened_pickup_package_ids,
    waiting_open_door_only_package_ids,
    waiting_local_pickup_package_ids
  } = deliveryInfo.data;
  const {
    page_data,
    map_partition
  } = roleInfo.data;
  const {
    qrcode_datas = []
  }: any = siteInfo.data;
  const [topCell, setTopCell] = useState<any>([]);
  const [bottomCell, setBottomCell] = useState<any>([]);
  const page_config = page_data.page_config || {};
  const pathname = router.getPathName();
  const baseConf = page_config?.baseConf || {};
  const waiting_local_pickup_delivery_infos_cache = deliveryInfo.getDeliveryPackageInfo(waiting_local_pickup_package_ids);
  const cabinetsCount = cabinets.filter(item => item.status === ICabinetStatus.CLOSED && !item.package_id).length;
  const waiting_opened_pickup_package_ids_effect = useCampare(waiting_opened_pickup_package_ids, isEqual);
  const waiting_open_door_only_package_ids_effect = useCampare(waiting_open_door_only_package_ids, isEqual);
  const getLocalPackageIds = () => {
    return robotInfo.getPackageIds(PackageType.DEVLIVERY);
  };
  const onCollectHandle = () => {
    const audios = this_page_config?.collect_btn_feedback || [];
    audio.play(audios?.map(item => robotInfo.getLocalPath(item?.url)));
    router.push(`${BASE_ROUTER.EXPRESS}/${ROUTER_PATH.EXPRESS_CLOUD_COLLECT_INPUT}`);
  };
  const onPickupHandle = () => {
    const {
      admin_password
    } = siteInfo.data;
    const {
      waiting_local_pickup_package_ids,
      waiting_pickup_package_ids
    } = deliveryInfo.data;
    const audios = this_page_config?.pickup_btn_feedback || [];
    audio.play(audios?.map(item => robotInfo.getLocalPath(item?.url)));

    // 有云端的单子并且有本地的单子。点击取货跳转取货页面
    if (waiting_pickup_package_ids?.length && waiting_local_pickup_package_ids?.length) {
      return router.push(`${BASE_ROUTER.EXPRESS}/${ROUTER_PATH.EXPRESS_CLOUD_PICKUP_INPUT}`);
    }

    // 只有云端单子，点击取货跳转取货页面
    if (waiting_pickup_package_ids?.length) {
      return router.push(`${BASE_ROUTER.EXPRESS}/${ROUTER_PATH.EXPRESS_CLOUD_PICKUP_INPUT}`);
    }

    /**
     * 如果只有本地单子
     *   - 如果开启取货验证，需验证管理员密码
     *   - 如果未开启取货验证，点击取货直接开箱
     * 否则跳转输入取货码页面
     */

    if (waiting_local_pickup_package_ids?.length) {
      if (baseConf?.is_pickup_verify_enable) {
        uiInfo.openInteraction();
        const hidePassword = showPasswordVerify({
          title: lang("输入管理员密码"),
          onCheck: value => {
            if (value == admin_password) {
              onTake(waiting_local_pickup_delivery_infos_cache);
              return hidePassword();
            }
            robot.sendAnalyseEvent(UIEVENT_NAME.ERROR, {
              desc: lang("输入管理员密码错误")
            });
            return lang("密码错误");
          },
          back: true,
          onBack: () => {
            hidePassword();
            uiInfo.closeInteraction();
          }
        });
        return;
      } else {
        return onTake(waiting_local_pickup_delivery_infos_cache);
      }
    }
    return router.push(`${BASE_ROUTER.EXPRESS}/${ROUTER_PATH.EXPRESS_CLOUD_PICKUP_INPUT}`);
  };
  const onTake = async (tasks, isTray?) => {
    uiInfo.openInteraction();
    uiInfo.setLoading("opening");
    try {
      let cabinets: any = [];
      const packageIds = tasks.map(item => item.package_id);
      tasks.forEach(item => {
        cabinets = [...cabinets, ...item.package_positions];
      });
      const cabinetsData = cabinets.map(item => {
        const {
          cell_index,
          position_type
        } = item;
        return {
          cell_index,
          open_left_cabinet: [1, 3].includes(position_type),
          open_right_cabinet: [2, 3].includes(position_type)
        };
      });
      robot.openOrderDoorCabinets(cabinetsData, {
        onAck: () => {
          robot.sendEvent(EVENT_NAME.PACKAGE_PICKUP_OPEN_CABINET_EVENT, {
            package_ids: packageIds,
            reason: PackagePickupOpenCabinetEventReason.PICKUP_CODE_OPENED
            // cabinet_ids: cabinetIds,
          });
        },
        onSuccess: () => {
          uiInfo.setLoading(false);
          unmanned.setReceiverOrder({
            package_ids: packageIds,
            cabinets: cabinetsData
          });
          if (isTray) {
            router.push(`${BASE_ROUTER.EXPRESS}/${ROUTER_PATH.EXPRESS_TRAY_PICKUP_FINISH}`);
          } else {
            router.push(`${BASE_ROUTER.EXPRESS}/${ROUTER_PATH.EXPRESS_CLOUD_PICKUP_FINISH}`);
          }
        },
        onFailed: () => {
          uiInfo.setLoading(false);
          unmanned.setReceiverOrder({
            package_ids: packageIds,
            cabinets: cabinetsData
          });
          if (isTray) {
            router.push(`${BASE_ROUTER.EXPRESS}/${ROUTER_PATH.EXPRESS_TRAY_PICKUP_FINISH}`);
          } else {
            router.push(`${BASE_ROUTER.EXPRESS}/${ROUTER_PATH.EXPRESS_CLOUD_PICKUP_FINISH}`);
          }
        }
      });
    } catch (e) {
      uiInfo.setLoading(false);
    }
  };

  // 获取分区图形
  const getIcon = packageInfo => {
    const robot_map_partition = map_partition?.icon;
    const icons = packageInfo?.zone_group_icon || [];
    if (icons?.includes(robot_map_partition)) {
      return robot_map_partition;
    }
    return icons?.[0];
  };
  const cabinetItem = (item, index) => {
    const {
      delivery_infos
    } = deliveryInfo.data;
    const package_id = item?.package_id;
    const packageInfo = delivery_infos?.find(item => item?.package_id == package_id);
    return <div className={classNames(styles.cabinet, {
      [styles.selected]: item.status === ICabinetStatus.CLOSED && !item.package_id
    })} key={index}>
        {getIcon(packageInfo)}
      </div>;
  };
  const topCellDom = useMemo(() => topCell.map((item, index) => {
    return cabinetItem(item, index);
  }), [topCell]);
  const bottomCellDom = useMemo(() => bottomCell.map((item, index) => {
    return cabinetItem(item, index);
  }), [bottomCell]);
  const this_page_config = useMemo(() => (page_config?.pageStructure || {})[pathname] || {}, [page_config]);
  const getQrcodeUrl = useMemo(() => {
    const qrcode = (qrcode_datas || []).find(item => this_page_config?.qrcode_image_source == QrcodeType.QRCODE_TYPE_USER ? item.qrcode_type == QrcodeType.QRCODE_TYPE_USER : this_page_config?.qrcode_image_source == QrcodeType.QRCODE_TYPE_RIDER ? item.qrcode_type == QrcodeType.QRCODE_TYPE_RIDER : false);
    if (this_page_config?.qrcode_image_source == QrcodeType.QRCODE_TYPE_CUSTOM) {
      const url = (this_page_config?.qrcode_image || [])[0]?.url;
      if (url) {
        return robotInfo.getLocalPath(url);
      }
    } else {
      return qrcode?.qrcode_url;
    }
  }, [qrcode_datas, page_config]);
  useEffect(() => {
    const {
      delivery_infos
    } = deliveryInfo.data;
    const pickup_ids = getLocalPackageIds();
    const _waiting_opened_pickup_package_ids = waiting_opened_pickup_package_ids_effect || [];
    const _waiting_open_door_only_package_ids = waiting_open_door_only_package_ids_effect || [];
    if (_waiting_opened_pickup_package_ids?.length > 0 || _waiting_open_door_only_package_ids?.length > 0) {
      remoteOpen(delivery_infos?.filter(item => pickup_ids?.includes(item?.package_id)), _waiting_opened_pickup_package_ids, _waiting_open_door_only_package_ids);
    } else {
      uiInfo.closeInteraction();
    }
  }, [waiting_opened_pickup_package_ids_effect, waiting_open_door_only_package_ids_effect]);
  useEffect(() => {
    const allCabinets = cabinets || [];
    setTopCell(allCabinets.filter(item => {
      return item.cell_index === 1;
    }));
    setBottomCell(allCabinets.filter(item => {
      return item.cell_index === 2;
    }));
  }, [cabinets]);
  useEffect(() => {
    const {
      cabinets
    } = robotInfo.data;
    const {
      waiting_local_pickup_package_ids
    } = deliveryInfo.data;
    const waiting_local_pickup_delivery_infos_cache = deliveryInfo.getDeliveryPackageInfo(waiting_local_pickup_package_ids);
    // 获取全部package_ids
    const pickup_ids = getLocalPackageIds();
    const waiting_pickup_delivery_infos_cache = deliveryInfo.getDeliveryPackageInfo(pickup_ids);

    // 当本地的packages大于0时
    if (waiting_pickup_delivery_infos_cache?.length) {
      // 获取本地的所有packages是不是都是无需开仓
      const flag = waiting_pickup_delivery_infos_cache?.every(item => {
        const package_positions = item?.package_positions || [];
        const activedCabinets = package_positions?.map(_item => {
          let activedCabinet: any = {};
          const data = {
            cell_index: _item.cell_index,
            open_left_cabinet: [1, 3].includes(_item.position_type),
            open_right_cabinet: [2, 3].includes(_item.position_type)
          };
          for (let i = 0; i < cabinets.length; i++) {
            if (Object.keys(data).every(key => cabinets[i][key] == data[key])) {
              activedCabinet = cabinets[i];
            }
          }
          return activedCabinet;
        });
        return activedCabinets?.every(c => c?.entity_type == EntityType.BOX_TRAY);
      });

      // 如果全部是无需开仓的直接跳转取货完成页面
      if (flag) {
        onTake(waiting_local_pickup_delivery_infos_cache, true);
      }
    }
  }, []);
  return <Layout>
      <div className={styles.page}>
        {cabinetsCount > 0 ? <header className={styles.header}>
            <h2 className={styles.title}>
              <Scalable spacing={0} zoomType="zoom">
                <div>
                  {lang("剩余{{data}}个箱格可用", {
                data: cabinetsCount
              })}
                  <div className={styles.info}>
                    <div className={styles.cell}>{topCellDom}</div>
                    <div className={styles.cell}>{bottomCellDom}</div>
                  </div>
                </div>
              </Scalable>
            </h2>
            {estimate_end_timestamp > 0 && <div className={styles.subTitle}>
                {lang("预计{{data}}出发", {
            data: dateFormat(estimate_end_timestamp * 1000, "hh:mm:ss")
          })}
              </div>}
          </header> : <header className={styles.header}>
            <h2 className={styles.title}>
              {this_page_config?.full_title || lang("好忙，都装满了呢")}
            </h2>
            {estimate_end_timestamp > 0 && <div className={styles.subTitle}>
                {lang("预计{{data}}出发", {
            data: dateFormat(estimate_end_timestamp * 1000, "hh:mm:ss")
          })}
              </div>}
          </header>}
        <div className={styles.actionWrap}>
          {this_page_config?.qrcode_enable && getQrcodeUrl && <div className={styles.banner}>
              <div className={styles.qrcode}>
                <img src={getQrcodeUrl} alt="" />
              </div>
              <div className={styles.prompt}>
                <div className={styles.prompt_content}>
                  <h4>
                    <Scalable spacing={0} position="right">
                      {this_page_config?.qrcode_info_title || lang("扫码取货")}
                    </Scalable>
                  </h4>
                  <div className={styles.subPrompt}>
                    {this_page_config?.qrcode_info_sub_title || "SCAN QR CODE"}
                  </div>
                </div>
              </div>
            </div>}

          <div className={classNames(styles.actions, {
          [styles.actionsNoQrcode]: !this_page_config?.qrcode_enable
        })}>
            {cabinetsCount > 0 && <Button bold primary className={classNames(styles.action, styles.collect)} onClick={onCollectHandle}>
                {this_page_config?.collect_btn || lang("放货")}
              </Button>}
            {getLocalPackageIds()?.length > 0 && <Button bold className={classNames(styles.action, styles.pickup)} onClick={onPickupHandle}>
                {this_page_config?.pickup_btn || lang("取货")}
              </Button>}
          </div>
        </div>
      </div>
    </Layout>;
});