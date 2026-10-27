// 公开资料用于渠道对象命名；分类、门店、团队与数值均为项目演示设计，非合作供应商清单。
export interface ChannelObject {
  id: string;
  name: string;
  details: string[];
}
export interface ChannelCategory {
  id: string;
  name: string;
  alias?: string;
  objects: ChannelObject[];
}
const object = (id: string, name: string, details: string[]): ChannelObject => ({
  id,
  name,
  details,
});
export const channelCatalog: ChannelCategory[] = [
  {
    id: 'walk-in',
    name: '自然到访',
    objects: [
      object('walk-passing', '售楼处路过', ['现场自主到访']),
      object('walk-neighbor', '周边居民', ['周边居住自主到访']),
      object('walk-brand', '品牌主动咨询', ['品牌认知自主到访']),
    ],
  },
  {
    id: 'broker',
    name: '中介分销',
    objects: [
      object('broker-lianjia', '链家', ['合作门店01（模拟）', '合作门店02（模拟）']),
      object('broker-deyou', '德佑', ['合作门店01（模拟）', '合作门店02（模拟）']),
      object('broker-fangyou', '易居房友', ['合作门店01（模拟）', '合作门店02（模拟）']),
      object('broker-local', '本地独立中介', ['区域供应商A（模拟）', '区域供应商B（模拟）']),
    ],
  },
  {
    id: 'direct',
    name: '自渠自拓',
    objects: [
      object('direct-community', '社区拓客', ['社区拓客组（模拟）']),
      object('direct-mall', '商圈驻点', ['商圈驻点组（模拟）']),
      object('direct-enterprise', '企业团拓', ['企业拓客组（模拟）']),
      object('direct-park', '园区拓客', ['园区拓客组（模拟）']),
      object('direct-partner', '异业合作', ['商户合作组（模拟）']),
    ],
  },
  {
    id: 'online',
    name: '线上获客',
    objects: [
      object('online-douyin', '抖音', ['短视频留资', '直播留资', '房产小程序']),
      object('online-redbook', '小红书', ['内容笔记留资', '搜索留资', '私信咨询']),
      object('online-wechat', '微信', ['视频号', '朋友圈', '公众号', '小程序']),
      object('online-kuaishou', '快手', ['房产直播', '短视频咨询']),
      object('online-anjuke', '安居客', ['楼盘详情留资', '在线咨询']),
    ],
  },
  {
    id: 'owner',
    name: '老带新',
    objects: [
      object('owner-delivered', '已交付业主推荐', ['业主推荐活动（模拟）']),
      object('owner-signed', '已签约业主推荐', ['签约客户推荐活动（模拟）']),
      object('owner-club', '业主社群推荐', ['业主社群活动（模拟）']),
    ],
  },
  {
    id: 'referral',
    name: '全面营销',
    alias: '全民营销',
    objects: [
      object('referral-staff', '员工推荐', ['员工推荐计划（模拟）']),
      object('referral-social', '社会推荐人', ['社会推荐计划（模拟）']),
      object('referral-partner', '合作伙伴推荐', ['合作推荐计划（模拟）']),
      object('referral-ambassador', '注册推荐官', ['推荐官活动（模拟）']),
    ],
  },
  {
    id: 'other',
    name: '其他',
    objects: [
      object('other-cross-project', '跨项目转介', ['项目联动转介（模拟）']),
      object('other-offline', '线下活动合作', ['品牌联合活动（模拟）']),
      object('other-unknown', '来源待核实', ['待核实来源']),
    ],
  },
];
export const channelLeaves = channelCatalog.flatMap((category, categoryIndex) =>
  category.objects.flatMap((item, objectIndex) =>
    item.details.map((detail, detailIndex) => ({
      channel: category.name,
      channelObject: item.name,
      channelObjectId: item.id,
      channelDetail: `${item.name} · ${detail}`,
      channelDetailId: `${item.id}-${detailIndex}`,
      categoryIndex,
      objectIndex,
      detailIndex,
    })),
  ),
);
