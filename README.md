# Codex App GPT-5.6 模型显示工具 | AICodeMirror

由 **AICodeMirror 团队**制作和打包，基于开源项目 [Veath/codexfast](https://github.com/Veath/codexfast)。这是一个面向 **OpenAI Codex App / ChatGPT Codex 桌面端**的 GPT-5.6 模型显示工具（GPT-5.6 model picker / model list）。

本工具用于解决“**Codex App 模型列表不显示 GPT-5.6**”“**ChatGPT Codex 模型下拉菜单没有 Sol、Terra、Luna**”等问题。它通过运行时 CDP 注入修改 Codex / ChatGPT 桌面端的前端模型列表与动态白名单过滤，使 GPT-5.6 系列模型显示在模型下拉菜单中。它不会永久修改原始 App，也不会修改账号或 API 的模型权限。

[![Release](https://img.shields.io/github/v/release/Cute-chen/codex-for-5.6?label=Release)](https://github.com/Cute-chen/codex-for-5.6/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Cute-chen/codex-for-5.6/total?label=Downloads)](https://github.com/Cute-chen/codex-for-5.6/releases)
[![License](https://img.shields.io/github/license/Cute-chen/codex-for-5.6)](./LICENSE)

## 下载

| 平台 | 状态 | 下载 |
| --- | --- | --- |
| macOS Apple Silicon | 已验证 | [Mac-ACM.For.Codex.5.6.zip](https://github.com/Cute-chen/codex-for-5.6/releases/latest/download/Mac-ACM.For.Codex.5.6.zip) |
| Windows | 实验性支持 | [Win-ACM.For.Codex.5.6.zip](https://github.com/Cute-chen/codex-for-5.6/releases/latest/download/Win-ACM.For.Codex.5.6.zip) |
| SHA-256 | 校验文件 | [SHA256SUMS.txt](https://github.com/Cute-chen/codex-for-5.6/releases/latest/download/SHA256SUMS.txt) |

完整更新说明：[Releases](https://github.com/Cute-chen/codex-for-5.6/releases)

## 适用场景

当你在搜索或遇到以下问题时，本项目可能适用：

- Codex App 模型列表不显示 GPT-5.6
- Codex APP GPT-5.6 模型显示 / GPT-5.6 model picker
- ChatGPT Codex 模型下拉菜单缺少 GPT-5.6 Sol、Terra、Luna
- Codex 模型列表已拉取，但前端动态白名单过滤掉 5.6
- `use_hidden_models`、`available_models` 或 `availableModels` 使模型不可见
- 自定义 API（custom API / model provider）已支持 GPT-5.6，但 Codex App UI 中无法选择
- Codex App 模型选择器、model list、model dropdown 需要显示 GPT-5.6 系列

本项目不适用于 Provider 或服务端返回 `model_not_found`、`unsupported_model`、权限不足等情况；这些错误表示模型执行端未授权或不支持对应模型 ID。

## 主要功能

- 在模型下拉菜单中显示 `GPT-5.6 Sol`
- 在模型下拉菜单中显示 `GPT-5.6 Terra`
- 在模型下拉菜单中显示 `GPT-5.6 Luna`
- 补充动态 `availableModels` 白名单，避免模型被前端二次过滤
- 为 Sol 和 Terra 提供 `Max`、`Ultra` 推理选项
- 为 Luna 提供 `Max` 推理选项
- 使用运行时内存注入，不修改原始 `app.asar`
- macOS 版本提供终端交互界面和菜单栏运行状态
- macOS 菜单栏支持查看日志、关闭注入并退出 Codex
- Windows 版本支持常规安装和 Microsoft Store / MSIX 安装路径发现

## macOS 使用方法

### 环境要求

- macOS 12 或更高版本
- Apple Silicon (`arm64`)
- Node.js 18.12 或更高版本
- 已安装 ChatGPT / Codex App

当前打包版已验证：

- ChatGPT / Codex App `26.707.31428`
- build `5059`

### 启动步骤

1. 下载并解压 `Mac-ACM.For.Codex.5.6.zip`。
2. 完全退出正在运行的 ChatGPT / Codex App。
3. 双击 `ACM For Codex 5.6模型插件.app`。
4. 在终端菜单中选择：

```text
1、开始注入 5.6 模型列表插件
2、退出
```

5. 如果检测到 Codex 正在运行，可以选择自动关闭并重新启动。
6. 注入成功后会显示：

```text
Codex 显示5.6系列模型已注入成功，请享用
```

7. 提示显示 3 秒后终端自动关闭，菜单栏显示 `5.6 ✓`。

运行期间不需要保留 Terminal 窗口。菜单栏 helper 会在后台维持注入连接。

### 菜单栏操作

点击菜单栏中的 `5.6 ✓`：

- `查看运行日志`
- `关闭注入并退出 Codex`

关闭菜单栏 helper 会终止运行时注入。再次使用时请重新双击启动器。

## Windows 使用方法

Windows 版本目前属于实验性支持。

### 环境要求

- Windows 10 / 11
- Node.js 18.12 或更高版本
- 已安装 ChatGPT / Codex App

### 启动步骤

1. 下载并完整解压 `Win-ACM.For.Codex.5.6.zip`。
2. 右键运行 `右键-以管理员方式运行.cmd`。
3. 如果未手动选择管理员权限，脚本也会自动请求 UAC 提权。
4. 启动器会查找 ChatGPT / Codex 的常规安装目录和 Microsoft Store / MSIX 安装。
5. 保持启动器进程运行，以维持当前 Codex 会话的注入。

Windows 运行时已经包含平台专用的进程检测、App 路径发现、MSIX 激活、重启和 CDP 注入逻辑，内部运行时自检已通过。但当前发布未在真实 Windows Codex 环境完成完整端到端验证，实际兼容性取决于已安装 App 的前端代码签名。

## 工作原理

Codex / ChatGPT 桌面端的原始 `model/list` 结果可能已经包含 GPT-5.6，但前端还会使用远程动态配置中的 `use_hidden_models` 和 `available_models` 白名单再次过滤。

本工具会在应用启动时：

1. 使用本地 Chrome DevTools Protocol 端口启动 Codex / ChatGPT。
2. 在 renderer JavaScript 执行前拦截匹配的 `app://` JavaScript 响应。
3. 包装前端的 `model/list` 处理函数，添加或规范化 GPT-5.6 模型元数据。
4. 将 Sol、Terra 和 Luna 加入下游 `availableModels` 白名单。
5. 将修改后的 JavaScript 仅返回给当前运行会话。

原始 App 文件不会被永久改写：

- 不修改 `app.asar`
- 不修改原始 `Info.plist`
- 不重新签名原始 ChatGPT / Codex App
- 不安装系统级常驻补丁

## 兼容性说明

该工具依赖 Codex / ChatGPT 前端构建产物中的代码特征。App 更新后，如果相关 JavaScript 结构发生变化，注入可能失效，需要重新适配。

出现以下情况时，请查看最新 Release 或提交 Issue：

- 注入提示找不到目标代码
- Codex 更新后模型菜单再次隐藏 5.6
- 菜单栏显示 `5.6 !`
- Windows 版本无法找到已安装的 App
- CDP 连接或运行时补丁会话意外断开

问题反馈：[GitHub Issues](https://github.com/Cute-chen/codex-for-5.6/issues)

## 重要说明

- 本工具只修改前端模型菜单，不会解锁服务端模型权限。
- 自定义 API Provider 必须实际接受 `gpt-5.6-sol`、`gpt-5.6-terra` 或 `gpt-5.6-luna`。
- 如果 Provider 返回 `model_not_found`、`unsupported_model` 或权限错误，本工具无法绕过该服务端限制。
- 使用第三方 API Provider 前，请确认其凭据处理和隐私政策可信。
- 本项目不是 OpenAI 官方产品，与 OpenAI 无隶属或背书关系。

## 仓库内容

仓库只保留构建和检查当前发布版所需的内容，已移除上游 fork 中与发行无关的 `.agents`、开发规范、测试 fixture、历史适配笔记和 TypeScript 工程脚手架。

| 目录 | 用途 |
| --- | --- |
| [macos](./macos) | 双击启动器、终端交互界面、菜单栏 helper Objective-C 源码、App plist 与图标 |
| [runtime/macos](./runtime/macos) | macOS 发布包实际使用的 Node.js 运行时快照 |
| [runtime/windows](./runtime/windows) | Windows 发布包实际使用的 Node.js 运行时快照 |
| [windows](./windows) | Windows UAC 启动器 |
| [scripts](./scripts) | 重建 macOS App/ZIP 和 Windows ZIP 的打包脚本 |

`runtime` 下的两个单文件脚本是对应 Release 中实际执行的、可审查的 JavaScript 运行时快照。它们来自基于 `Veath/codexfast` 的已验证构建，并包含两端不同的 App 路径发现、进程管理和 CDP 适配；不要直接用 macOS 文件覆盖 Windows 文件，或反过来覆盖。

## 从仓库打包

macOS 需要 Node.js 18.12+、Xcode Command Line Tools 和 macOS 自带的 `codesign`、`ditto`。在仓库根目录运行：

```bash
zsh scripts/package-macos.zsh
```

产物为 `dist/Mac-ACM.For.Codex.5.6.zip`。脚本会从 `macos/`、`runtime/macos/` 生成 App、编译菜单栏 helper，并使用 ad-hoc 签名。

Windows 10/11 上，使用 PowerShell 生成 ZIP：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-windows.ps1
```

`dist/` 已被 Git 忽略，因此本地打包产物不会被提交。

## 开源致谢

感谢 [Veath/codexfast](https://github.com/Veath/codexfast) 提供核心运行时补丁机制和版本适配工作。

本 fork 增加和维护：

- AICodeMirror 品牌启动界面
- macOS 双击启动 App
- macOS 菜单栏 helper
- macOS / Windows 打包发行文件
- GPT-5.6 模型列表使用说明
- Windows 实验性运行时适配发行

## License

核心项目使用 MIT License，详见 [LICENSE](./LICENSE) 和 [NOTICE.md](./NOTICE.md)。打包版本中保留了上游开源声明和许可证。
