# Revornix 桌面端（Electron 薄壳）设计文档

- 日期：2026-07-12
- 状态：已批准，待实现
- 范围：新增 `desktop/` Electron 应用，兼容 macOS 与 Windows

## 1. 目标与非目标

### 目标

- 把现有 `web/` 客户端包装成可在 macOS 和 Windows 原生运行的桌面 app。
- 用户可自行选择连接的服务器：内置 `app.revornix.com`（国际）与 `app.revornix.cn`（大陆镜像），并支持自定义地址（自托管）。
- 打 tag 时通过 GitHub Actions 在 macOS / Windows runner 上构建产物并发布到 GitHub Releases。

### 非目标（第一版明确不做）

- 不做原生高级能力：托盘、全局快捷键、`revornix://` 深链、离线缓存、本地全文索引。均为后续迭代。
- 不做代码签名 / 公证（但预留配置位，拿到证书后零改代码启用）。
- 不内置 Next.js 服务器（不打包 `web/.next/standalone`）。窗口加载远程 URL。
- 不改动 `web/`、`api/`、`celery-worker/`、`gateway/` 任何现有代码，不改动现有 Docker CI。

## 2. 关键决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 加载目标 | 远程 URL（可切换服务器） | web 是 Next.js SSR，需 Node 服务器；后端 API 恒在远程。薄壳最省心，前端更新无需重发桌面版。 |
| 工具链 | electron + `tsc` + electron-builder | 壳只有百余行主进程代码，无需 bundler；electron-builder 的 GitHub 发布与未来 electron-updater 迁移成本最低。 |
| 首次启动 | 本地弹选择页 picker | 尊重地区选择，最清晰。 |
| 原生能力 | 纯壳 MVP | 先把打包发布链路跑通，原生功能后续迭代。 |
| 签名 | 暂不签名，预留配置 | 起步成本为零；检测到签名环境变量时自动启用。 |
| CI | 新增独立 GitHub Actions workflow | 与现有 Docker workflow 隔离，互不干扰。 |

## 3. 架构与目录

Electron 薄壳，只做「一个可切换服务器的原生浏览器窗口」。主进程 TypeScript，用 `tsc` 编译，不引 bundler；打包用 electron-builder。

```text
desktop/
├── src/
│   ├── main/
│   │   ├── main.ts            # 应用入口：窗口生命周期、菜单、单实例锁
│   │   ├── window.ts          # BrowserWindow 创建 + 加载当前服务器 URL
│   │   ├── servers.ts         # 服务器列表定义 + URL 校验 + 当前选中项
│   │   ├── store.ts           # 轻量持久化（选中服务器 → userData/config.json）
│   │   ├── menu.ts            # 原生菜单（含「切换服务器」子菜单）
│   │   └── external-links.ts  # 外部链接策略（系统浏览器 vs 窗口内）
│   ├── preload/
│   │   └── preload.ts         # contextBridge 暴露最小 API（读取/切换服务器）
│   └── renderer/
│       └── picker.html        # 唯一的本地页面：首次启动服务器选择
├── assets/                    # 图标（icns/ico/png）、tray 预留
├── build/                     # electron-builder 图标与 entitlements
├── electron-builder.yml       # 打包配置（mac dmg+zip / win nsis）
├── tsconfig.json
├── package.json               # scripts: dev / build / package:mac / package:win
└── README.md                  # 从 placeholder 更新为实际说明
```

**会话持久化**：靠 Electron 默认持久 partition（userData 下 Cookie/localStorage 自动落盘），登录态与 token 天然保留，不碰 web 端认证逻辑。每个服务器 origin 各自独立存 cookie，切换服务器互不污染。

## 4. 服务器切换机制

- **内置列表**（`servers.ts`）：`app.revornix.com`、`app.revornix.cn`，外加用户自填的「自定义服务器」。
- **首次启动**：若 `config.json` 无选中项，加载本地 `picker.html`，用户点选或填地址；选定后写入配置并加载对应 URL。
- **切换入口**：原生菜单 `服务器 → ○ app.revornix.com / ○ app.revornix.cn / 自定义… / 重新选择`。切换即 `loadURL` 到新 origin，无需重启。
- **自定义地址校验**：只接受 `https://`（或 `http://` 仅限 localhost / 127.0.0.1，方便自托管调试），拒绝非法输入，防止壳被诱导加载任意站点。

## 5. 窗口、外链与安全策略

- **BrowserWindow**：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。preload 仅经 `contextBridge` 暴露读取/切换服务器的方法，不给远程页面任何 Node 能力。
- **外部链接**：`setWindowOpenHandler` + 拦截 `will-navigate`。目标 origin 不在「当前服务器 + 允许列表」内的导航，一律 `shell.openExternal` 交给系统浏览器；壳窗口只停留在应用 origin。
- **OAuth 取舍**：Web 端 OAuth 成功后重定向回应用前端路由。为与网页版体验一致且不改后端，第一版把 OAuth 提供商域名（Google / GitHub / 微信）加入「允许在窗口内导航」名单，让整个登录流程留在壳窗口内完成；纯外部文档链接才踢给系统浏览器。允许列表还需包含 OAuth 回调、支付、hot-news 网关域名。
- **单实例锁**：`requestSingleInstanceLock`，第二次启动聚焦已有窗口（也为将来 `revornix://` 深链预留入口）。
- **权限**：`setPermissionRequestHandler` 默认放行通知/剪贴板等 web 端已用能力，拒绝其余。

## 6. 打包产物矩阵

`electron-builder.yml`：

| 平台 | 产物 | 架构 |
|---|---|---|
| macOS | `.dmg`（拖拽安装）+ `.zip`（供 updater） | arm64 + x64（分开出） |
| Windows | `.exe`（NSIS 安装包） | x64 |

- **暂不签名**：mac 侧 `identity: null`，README 写明首次打开需右键→打开 / 系统设置里允许；Windows 用户忽略 SmartScreen。
- **签名预留**：检测到 `CSC_LINK` / `APPLE_ID` 等环境变量时自动启用签名与公证，拿到证书零改代码。
- **自动更新预留**：`publish` 配 GitHub provider；第一版只产出安装包，壳内留好 electron-updater 挂载点，后续迭代直接开启。

## 7. CI

- 新增 `.github/workflows/desktop-release.yml`，触发条件 `desktop-v*` tag。
- 两个 job：`macos-latest` 出 dmg/zip，`windows-latest` 出 exe，产物上传 GitHub Releases。
- 与现有 Docker workflow 完全隔离，不修改它。

## 8. 测试

- **冒烟测试**：Playwright 的 Electron 驱动——启动 app、断言窗口加载了选中服务器 URL、切换服务器后 URL 变化、外链走 `openExternal`。
- **单元测试**：`servers.ts` 的 URL 白名单/校验逻辑。
- 不测远程 web 页面本身（属于 `web/` 职责）。

## 9. 风险

- **OAuth 回跳**：已用「登录导航留在窗口内」规避；若后端未来改为强制外部浏览器回跳，需引入 `revornix://` 深链方案。
- **未签名分发**：首次打开有系统拦截提示，靠 README 引导；不影响功能。
- **架构覆盖**：Windows 仅出 x64；如需 arm64 后续在矩阵中追加。
