# agents.md — lumolog 项目架构与功能理解

本文件用于辅助 AI 助手（如 Claude Code / 其他 agent）快速理解本项目。它聚焦「架构是什么、模块在哪、功能如何实现、关键约束是什么」，不重复 README 的用法说明。若 README 与代码冲突，以代码为准。

## 1. 项目是什么

**lumolog**：一个基于 Next.js（App Router）的摄影图集网站。访客按「分类 / 标签 / 分页」浏览作品墙，点击作品封面可打开居中大图预览。**无上传 / 管理界面**，作品数据通过本地 TypeScript 文件或远程 JSON 驱动。

- 技术栈：Next.js 16.3（React 19, TypeScript 严格模式, `@/*` 别名指向 `src/*`）、Zod 4（数据校验）、Vitest（单元测试）、ESLint 9。
- 运行要求：Node.js >=24 <25。
- 路由模式：服务端渲染为主，所有页面 `export const dynamic = 'force-dynamic'`（不静态导出，依赖运行时数据）。

## 2. 顶层文件

| 文件 | 职责 |
| --- | --- |
| `data.ts` | **默认作品数据源**。一个 `Gallery` 类型对象，直接 import 使用。是完整、可编辑的作品清单。 |
| `.env.example` | 三个可选环境变量的说明模板（见 §6）。 |
| `next.config.ts` | `reactStrictMode`、`trailingSlash: true`（**注意：URL 一律带尾斜杠**）、`images.remotePatterns` 从 `image-origins` 动态生成、图片质量 `[75]`。 |
| `tsconfig.json` | `@/*` → `./src/*` 别名；严格模式。 |
| `netlify.toml` / `edgeone.json` | Netlify / EdgeOne 部署配置，产物均为 `.next`（必须服务端运行，不能静态导出）。 |
| `.github/workflows/ci.yml` | push / PR 触发：`npm ci` → lint → test → build（Node 22，注意与本地 24 不同）。 |
| `public/images/` | 站点标识、占位图 `photo-fallback.svg`、示例图（`/images/demo/...`）。 |

## 3. 目录结构

```text
data.ts                      默认作品数据
src/
  app/                       App Router：页面、API、站点元数据
    layout.tsx               RootLayout + 全局 metadata / openGraph
    page.tsx                 首页（全部作品，第 1 页）
    page/[number]/page.tsx   首页分页（trailingSlash 下 `/page/2/`）
    photos/page.tsx          「全部作品」独立页
    categories/…            分类总览页 + 单分类页
    tags/…                  标签总览页 + 单标签页
    api/albums/route.ts      滚动加载的分页 JSON API
    robots.ts / sitemap.ts   SEO
    globals.css             全部样式（深色主题，CSS 变量驱动）
  components/               客户端组件
    gallery-page.tsx         服务端→客户端桥接：取数、过滤、分页、404 判断
    gallery-wall.tsx         照片墙 + 无限滚动 + 弹层编排（核心客户端逻辑）
    gallery-card.tsx         单个作品卡片
    gallery-unavailable.tsx  图库不可用时的错误页
    page-frame.tsx           页面外壳（main + SiteHeader）
    site-header.tsx          顶部导航（分类下拉、全屏）
    lightbox.tsx             居中大图预览弹层
    tag-tile.tsx             标签总览的瓦片卡片
  lib/                       纯逻辑层（无 React，可测试）
    gallery-schema.ts        Zod 数据模型
    gallery-source.ts        数据加载（本地 / 远程）+ 校验
    gallery-view.ts          查询 / 过滤 / 分页 / 术语工具
    gallery-navigation.ts    弹层内选择移动逻辑
    image-origins.ts         远程图片来源白名单
    *.test.ts                Vitest 测试（schema/source/view/navigation）
```

## 4. 数据流（一次请求）

1. 路由页面调用 `getGallery()`（`gallery-source.ts`）。
2. `loadGallery()` 决定数据源：设置了 `GALLERY_JSON_URL` → 拉取远程 JSON（有大小 / 协议 / 超时限制）；否则用本地 `data.ts`。
3. 数据过 `gallerySchema.safeParse`（Zod 严格校验），失败抛 `GalleryUnavailableError`。
4. 页面在服务端用 `gallery-view.ts` 过滤（按 kind/term）并分页（`PAGE_SIZE=12`），把**当前页**作品交给 `GalleryWall`。
5. 浏览器端 `GalleryWall` 用 `IntersectionObserver` 监测哨兵元素，到下一页时 `fetch(/api/albums?...page=N)` 追加作品。
6. `GalleryPage` / 页面在数据为空或页码越界时返回 `notFound()`；取数异常时渲染 `GalleryUnavailable` 错误页。

> 关键点：**首屏在服务端取数 + 渲染，翻页在客户端增量拉取**。`getGallery` 用 React `cache` 去重同一渲染内的多次读取，但远程 fetch 本身 `no-store` 不缓存。

## 5. 数据模型（`gallery-schema.ts`）

三个 `z.strictObject`（未知字段会校验失败）：

- **`Gallery`**：`version: 1` + `albums[]`。`superRefine` 校验 album id 全局唯一。
- **`Album`**：`id`（小写字母数字连字符）、`title`、`date`（ISO）、`description?`、`categories[]`、`tags[]`、`location?`、`photos[]`（至少 1 张）。`superRefine` 校验组内 photo id 唯一。
- **`Photo`**：`id`、`src`、`thumb?`、`metadataSrc?`、`alt`、`caption?`、`credit?`（name/url/license）、拍摄参数（`camera/lens/focal_length/aperture/shutter/iso/taken`）、`location?`、`lat?/lon?`（**成对出现**）。

约束与规则：
- 图片 `src`/`thumb` 必须符合 `/images/...` 本地路径，或通过 `isAllowedRemoteImage` 命中 `IMAGE_REMOTE_ORIGINS` 白名单。
- `lat/lon` 必须同时提供或同时缺省。
- 拍摄参数字段**只校验、前端不展示**；预览不读 EXIF（`metadataSrc` 保留但未用于读取）。

## 6. 环境变量

| 变量 | 作用 | 缺失时的行为 |
| --- | --- | --- |
| `GALLERY_JSON_URL` | 远程作品 JSON 地址。设置后**完全替代**本地 `data.ts`；每次访问实时读取校验。 | 使用本地 `data.ts`。 |
| `IMAGE_REMOTE_ORIGINS` | 逗号分隔的 HTTPS 来源白名单，用于远程图片 `src`/`thumb`。需同时提供给构建与运行环境。 | 只允许 `/images/` 项目内图片。 |
| `SITE_URL` | 分享卡片（openGraph）与 sitemap/robots 的绝对站点地址。 | 回退 `http://localhost:3000`。 |

- `gallery-source.ts` 强制远程 URL 必须 HTTPS（仅例外：`http://localhost` / `http://127.0.0.1`，供本地调试远程源）。
- `image-origins.ts` 强制白名单必须是**精确 origin**（带 https、无路径/端口/通配符）。
- 远程 JSON 有 2MB 上限、5s 超时、`no-cache`。

## 7. 页面 / 路由清单

| 路由 | 组件 | 说明 |
| --- | --- | --- |
| `/` | `page.tsx` | 全部作品第 1 页 |
| `/page/[number]/` | `page/[number]/page.tsx` | 首页后续页 |
| `/photos/` | `photos/page.tsx` | 「全部作品」独立页 |
| `/categories/` | `categories/page.tsx` | 分类总览（`termsFor` 汇总 + 数量） |
| `/categories/[slug]/` | `categories/[slug]/page.tsx` | 单分类下作品墙，`generateMetadata` 用 slug 作标题 |
| `/tags/` | `tags/page.tsx` | 标签总览（`TagTile` 瓦片网格） |
| `/tags/[slug]/` | `tags/[slug]/page.tsx` | 单标签下作品墙 |
| `/api/albums` | `api/albums/route.ts` | GET：`?page&kind&term`，返回 `{albums, total}`；参数不合法→400，取数失败→503，均 `no-store` |
| `/robots.txt` `/sitemap.xml` | `robots.ts` / `sitemap.ts` | SEO；sitemap 用 `termsFor` 枚举分类/标签 URL |

## 8. 客户端组件要点

- **`gallery-wall.tsx`**：状态机核心。
  - `albums`（已加载作品）以 `initialAlbums` 为种子，用 Set 按 id 去重追加。
  - 无限滚动：`IntersectionObserver` + `rootMargin 300px`；`inFlight` 防重入；`AbortController` 取消；失败置 `failed`，降级为「点击继续浏览」链接；不支持 observer 时也走链接回退。
  - 弹层：`selection = { albumIndex, photoIndex } | null`，`openedFrom` 记录触发按钮用于动画与焦点还原。
- **`gallery-card.tsx`**：封面图 `thumb ?? src`；加载失败回退到 `photo-fallback.svg`；首张 `preload` / `loading=eager`，其余 lazy。
- **`lightbox.tsx`**：原生 `<dialog>` + `showModal()`。
  - 动画：`Element.animate` 从触发卡片位置缩放入场 / 反向退场（尊重 `prefers-reduced-motion`）。
  - 导航：左右箭头键、上一张/下一张按钮、指针滑动（`setPointerCapture` + 位移阈值）切换照片；`gallery-navigation.moveSelection` 处理组内/跨组/两端环绕。
  - 显示：`caption` 优先，回退 `description`；`taken` 优先，回退 `date`；credit 链接外链。缩略图先载作渐进占位，原图 `loading=eager`。
- **`site-header.tsx`**：分类下拉（hover + click 双模式，外部点击 / Esc 关闭）、全屏切换、当前项高亮（`data-active`）。
- **`page-frame.tsx`**：服务端外壳，把 `termsFor(categories)` 传给 header 渲染分类菜单。

## 9. lib 纯逻辑层（有测试）

| 模块 | 职责 | 对应测试 |
| --- | --- | --- |
| `gallery-view.ts` | `orderedAlbums` / `albumsFor`（按 kind+term 过滤）/ `termsFor`（分组计数、中文排序）/ `pageOf`（分页，`PAGE_SIZE=12`）/ `termUrl`（生成 URL，含尾斜杠）。 | `gallery-view.test.ts` |
| `gallery-navigation.ts` | `moveSelection(albums, selection, ±1)`：组内移动→跨组→两端环绕。 | `gallery-navigation.test.ts` |
| `gallery-schema.ts` | Zod 模型与校验规则。 | `gallery-schema.test.ts` |
| `gallery-source.ts` | 数据源选择 / 远程拉取限制 / 校验错误映射。 | `gallery-source.test.ts` |

> 测试用仓库根 `data.ts` 作为 fixture（如 `moveSelection` 测试 `data.albums.slice(...)`）。

## 10. 样式（`globals.css`，281 行）

- 深色主题，`:root` 用 CSS 变量（`--bg / --panel / --text / --accent / --glass-*` 等），`color-scheme: dark`。
- 关键类：`.gallery-grid`（响应式列）、`.gallery-load-more`（无限滚动哨兵区）、`.lightbox-*`（弹层）、`.tag-tile`、`.term-list`、`.nav-*`（头部导航）。
- 渐进加载：卡片 `.is-loaded`、`body.is-loading-enhanced` 等类控制图片渐显。

## 11. 已知约定 / 易踩坑

1. **尾斜杠**：`trailingSlash: true`，`termUrl`/fallback 均补尾斜杠，跳转勿漏。
2. **服务端为主**：所有数据页 `force-dynamic`；改 `data.ts` 需重新部署才生效（远程 JSON 不必）。
3. **图片白名单**：新增远程图片来源必须加 `IMAGE_REMOTE_ORIGINS` 并**重新部署**（构建期 `remotePatterns` 用同一来源）。
4. **失败优先**：数据不可用 / 校验失败时显示 `GalleryUnavailable`（含重试），不静默展示过期本地内容。
5. **`lat/lon` 成对**：schema 强制，缺一个即校验失败。
6. **remote `http` 仅限 localhost**：生产远程源必须是 HTTPS。
7. CI 用 Node 22，本地/部署要求 Node 24——若 CI 偶发行为差异，先核对 Node 版本。
8. `unoptimized` 仅用于回退占位图（本地 fallback svg 与加载失败后的原图），其余用 `next/image` 优化。
