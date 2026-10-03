/**
 * 站点全局配置。
 * 集中存放站点名称、副标语、描述、眉题、版权署名等硬编码文案，
 * 供服务端与客户端组件统一引用，避免散落各处难以维护。
 */
export const siteConfig = {
  /** 站点名称（浏览器标题 / 头部品牌 / 分享卡片 / 版权署名） */
  name: '克喵Gallery',
  /** 头部品牌副标语 */
  tagline: '存放着我一些有纪念意义的照片。',
  /** 站点描述（<meta> 与 openGraph 分享卡片） */
  description: '以存放着我一些有纪念意义的照片。',
  /** 作品墙顶部眉题（eyebrow） */
  collectionEyebrow: '克喵Gallery collection',
  /** 版权署名人 */
  copyrightHolder: '克喵:)',
  /** 版权起始年份 */
  copyrightStartYear: 2024,
} as const;