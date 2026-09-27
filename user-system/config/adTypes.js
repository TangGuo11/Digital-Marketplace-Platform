/** 广告类型配置 — 接 Offerwall / Survey 等平台时可按类型调整 */
module.exports = {
  offerwall: {
    name: "积分墙",
    description: "完成积分墙任务获取积分",
    defaultPoints: 9999,
    dailyLimit: 50
  },
  survey: {
    name: "问卷调查",
    description: "完成问卷调研获取积分",
    defaultPoints: 4500,
    dailyLimit: 50
  },
  rewarded_video: {
    name: "激励视频",
    description: "观看完整激励视频获取积分",
    defaultPoints: 25,
    dailyLimit: 50
  },
  popunder: {
    name: "弹窗广告",
    description: "浏览弹窗广告页面获取积分",
    defaultPoints: 15,
    dailyLimit: 50
  },
  push: {
    name: "推送订阅",
    description: "订阅推送通知获取一次性积分",
    defaultPoints: 5,
    dailyLimit: 60
  },
  banner: {
    name: "横幅广告",
    description: "点击横幅广告获取积分",
    defaultPoints: 8,
    dailyLimit: 100
  }
}
