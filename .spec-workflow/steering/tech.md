# Technology Stack

## Project Type

Naimo 是一个跨平台桌面应用开发模板，基于 Electron 框架构建，采用现代化的 Web 技术栈来开发原生桌面应用程序。项目同时也是一个完整的开发工具平台，提供插件系统、自动化工具和企业级功能。

## Core Technologies

### Primary Language(s)

- **TypeScript 5.9.2**: 主要开发语言，提供类型安全和现代 JavaScript 特性
- **JavaScript ES2022**: 目标编译版本，支持最新的 ECMAScript 特性
- **Node.js**: 主进程运行时环境（通过 Electron）

### Runtime/Compiler

- **Electron 38.0.0**: 跨平台桌面应用框架，结合 Chromium 和 Node.js
- **Vite 7.1.5**: 快速的前端构建工具，支持热重载和 ESM
- **TypeScript Compiler**: 类型检查和代码编译
- **ESBuild**: Vite 内置的快速 JavaScript 打包器

### Language-specific Tools

- **pnpm**: 高效的包管理器，支持 workspace 和链接管理
- **ts-morph 27.0.0**: TypeScript 代码分析和生成工具，用于自动化 IPC 类型生成
- **Electron Forge 7.9.0**: Electron 应用打包、分发和开发工具链

### Key Dependencies/Libraries

#### 前端框架和 UI

- **Vue 3.5.18**: 渐进式 JavaScript 框架，采用 Composition API
- **Vue Router 4.5.1**: Vue.js 官方路由管理器
- **Pinia 3.0.3**: Vue 3 官方状态管理库
- **TailwindCSS 4.1.13**: 实用优先的 CSS 框架
- **@vueuse/core 13.9.0**: Vue Composition API 实用程序集合

#### 开发工具和插件

- **unplugin-auto-import**: Vue APIs 和组件自动导入
- **unplugin-vue-components**: Vue 组件自动注册
- **unplugin-icons**: 图标系统，支持多种图标库
- **@iconify-json/mdi**: Material Design Icons 图标集

#### 功能增强库

- **lodash-es 4.17.21**: JavaScript 实用工具库
- **axios 1.12.2**: HTTP 客户端，支持请求重试
- **hotkeys-js 3.13.15**: 键盘快捷键管理
- **mitt 3.0.1**: 轻量级事件发射器
- **vue-draggable-plus**: Vue 3 拖拽组件
- **pinyin-pro 3.27.0**: 中文拼音转换库

#### Electron 生态

- **electron-log 5.4.3**: 多进程日志管理系统
- **electron-store 10.1.0**: 数据持久化存储
- **update-electron-app 3.1.1**: 自动更新系统

#### 专用库（Workspace 模块）

- **download-manager**: 自定义下载管理库，基于 electron-dl-manager
- **auto-puppeteer**: 自动化库，集成 Puppeteer 和 Cheerio
- **app-search**: 应用搜索和图标提取工具

### Application Architecture

Naimo 采用**模块化多进程架构**，主要包含以下层次：

#### 1. 多进程架构

- **主进程 (Main Process)**: 负责应用生命周期、窗口管理、系统 API 调用
- **渲染进程 (Renderer Process)**: 运行 Vue.js 应用，处理用户界面
- **预加载脚本 (Preload Scripts)**: 安全桥接主进程和渲染进程

#### 2. IPC 通信架构

- **类型安全的 IPC 路由系统**: 基于 ts-morph 自动生成类型定义
- **双重命名支持**: 同时支持驼峰式和短横线式命名规范
- **模块化路由注册**: 按功能模块组织 IPC 处理器

#### 3. 插件系统架构

- **动态插件加载**: 支持运行时插件安装和卸载
- **沙盒环境**: 插件在独立的安全环境中运行
- **标准化 API**: 统一的插件开发接口

#### 4. 分层架构模式

```
┌─────────────────────────────────────┐
│           Vue.js 应用层              │  (UI 组件、页面路由)
├─────────────────────────────────────┤
│           状态管理层 (Pinia)          │  (全局状态、缓存)
├─────────────────────────────────────┤
│           IPC 客户端层               │  (类型安全的 API 调用)
├─────────────────────────────────────┤
│           IPC 路由层                │  (请求路由和处理)
├─────────────────────────────────────┤
│           服务层                    │  (业务逻辑、外部集成)
├─────────────────────────────────────┤
│           系统 API 层               │  (Electron APIs、Node.js)
└─────────────────────────────────────┘
```

### Data Storage

#### Primary Storage

- **electron-store**: JSON 格式的配置和用户数据存储
- **File System**: 临时文件、缓存、日志文件存储
- **Memory Storage**: 运行时状态和会话数据

#### Caching

- **Memory Cache**: Pinia 状态管理中的响应式缓存
- **File Cache**: 下载文件、图标、临时数据的磁盘缓存
- **HTTP Cache**: Axios 请求级别的缓存策略

#### Data Formats

- **JSON**: 配置文件、状态数据、IPC 通信
- **Binary**: 图标文件、下载内容、压缩数据
- **Text**: 日志文件、临时数据

### External Integrations

#### APIs 和服务

- **GitHub API**: 自动更新、版本检查
- **翻译服务**: 多语言翻译插件支持
- **OCR 服务**: 图像文本识别功能

#### Protocols

- **HTTP/HTTPS**: RESTful API 通信
- **File Protocol**: 本地文件访问
- **IPC Protocol**: 进程间通信

#### Authentication

- **API Keys**: 第三方服务认证
- **OAuth**: 可选的第三方登录集成
- **本地认证**: 应用级别的安全控制

### Monitoring & Dashboard Technologies

#### Dashboard Framework

- **Vue 3 + TypeScript**: 主要的前端技术栈
- **TailwindCSS**: 快速样式开发
- **Vite**: 开发服务器和构建工具

#### Real-time Communication

- **IPC Events**: 主进程和渲染进程的实时事件通信
- **File Watching**: 配置文件和资源的实时监控
- **WebSocket**: 可选的外部服务实时通信

#### Visualization Libraries

- **unplugin-icons**: 丰富的图标系统
- **CSS Animations**: 原生动画效果
- **Vue Transitions**: 页面和组件过渡效果

#### State Management

- **Pinia**: 集中式状态管理
- **VueUse**: 组合式 API 状态管理
- **electron-store**: 持久化存储作为数据源

## Development Environment

### Build & Development Tools

#### Build System

- **Vite**: 主要构建工具，支持 ES 模块和快速热重载
- **Electron Forge**: Electron 应用的打包和分发
- **TypeScript Compiler**: 类型检查和 JavaScript 代码生成
- **Rollup**: Vite 内置的生产环境打包器

#### Package Management

- **pnpm Workspace**: 单体仓库管理，支持多包开发
- **npm Scripts**: 自动化任务和命令管理
- **Cross-env**: 跨平台环境变量管理

#### Development Workflow

- **Hot Module Replacement (HMR)**: Vite 提供的快速热重载
- **Watch Mode**: TypeScript 和构建工具的文件监控
- **Multi-Entry**: 支持多个 HTML 入口点（主应用、裁剪窗口、日志查看器）

### Code Quality Tools

#### Static Analysis

- **TypeScript**: 静态类型检查和错误预防
- **ESLint**: 代码质量和风格检查（配置可扩展）
- **ts-morph**: 深度 TypeScript 代码分析

#### Formatting

- **Prettier**: 代码格式化（推荐配置）
- **EditorConfig**: 编辑器一致性配置

#### Testing Framework

- **单元测试**: 支持 Jest 或 Vitest（可配置）
- **E2E 测试**: 支持 Playwright for Electron
- **类型测试**: TypeScript 编译时类型验证

#### Documentation

- **JSDoc**: 代码内文档注释
- **Markdown**: 项目文档和说明文件
- **自动生成**: IPC 类型定义自动生成文档

### Version Control & Collaboration

#### VCS

- **Git**: 版本控制系统
- **GitHub**: 代码托管和协作平台

#### Branching Strategy

- **GitHub Flow**: 简化的分支策略，适合持续集成
- **Feature Branches**: 功能开发分支
- **Release Tags**: 版本标签管理

#### Code Review Process

- **Pull Request**: GitHub 标准代码审查流程
- **自动化检查**: CI/CD 集成的代码质量检查
- **Branch Protection**: 主分支保护规则

### Dashboard Development

#### Live Reload

- **Vite HMR**: 快速的模块热替换
- **Electron Reload**: 主进程代码更改后自动重启
- **Multi-Process Debugging**: 同时调试主进程和渲染进程

#### Port Management

- **Dynamic Port Allocation**: 自动检测可用端口
- **Configurable Ports**: package.json 中的端口配置
- **Proxy Configuration**: 开发环境的代理设置

#### Multi-Instance Support

- **Multiple Windows**: 支持多窗口应用开发
- **Process Isolation**: 不同功能模块的进程隔离
- **Resource Sharing**: 进程间资源共享机制

## Deployment & Distribution

### Target Platform(s)

- **Windows**: 主要目标平台，支持 x64 架构
- **macOS**: 跨平台支持，支持 Intel 和 Apple Silicon
- **Linux**: Debian/Ubuntu 和 Red Hat 系列支持

### Distribution Method

- **GitHub Releases**: 自动化发布到 GitHub
- **Direct Download**: 用户直接下载安装包
- **NSIS Installer**: Windows 自定义安装程序
- **App Store**: 可选的应用商店分发

### Installation Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, Linux (modern distributions)
- **Memory**: 最低 4GB RAM，推荐 8GB+
- **Storage**: 最低 500MB 可用空间
- **Network**: 互联网连接（用于更新和插件下载）

### Update Mechanism

- **Automatic Updates**: update-electron-app 自动更新系统
- **GitHub Releases**: 基于 GitHub Releases 的更新检测
- **Delta Updates**: 增量更新支持（可配置）
- **Manual Updates**: 用户手动检查和安装更新

## Technical Requirements & Constraints

### Performance Requirements

- **启动时间**: 应用启动时间 < 5秒
- **响应时间**: IPC 调用响应时间 < 100ms
- **内存使用**: 基础内存占用 < 200MB
- **热重载**: 开发环境代码更改响应 < 3秒

### Compatibility Requirements

#### Platform Support

- **Windows**: Windows 10 version 1903+ (64-bit)
- **macOS**: macOS 10.15 Catalina+
- **Linux**: Ubuntu 18.04+, CentOS 8+, Fedora 32+

#### Dependency Versions

- **Node.js**: >= 18.0.0（通过 Electron 内置）
- **Chromium**: 基于 Electron 38.0.0 内置版本
- **V8 Engine**: 跟随 Chromium 版本

#### Standards Compliance

- **ECMAScript 2022**: JavaScript 语言标准
- **W3C Web Standards**: 渲染进程中的 Web API
- **Electron Security**: 遵循 Electron 安全最佳实践

### Security & Compliance

#### Security Requirements

- **Context Isolation**: 预加载脚本的上下文隔离
- **Node Integration**: 禁用渲染进程的直接 Node.js 访问
- **Content Security Policy**: 严格的 CSP 头部设置
- **Code Signing**: 生产环境代码签名

#### Compliance Standards

- **Privacy**: 用户数据本地存储，无强制性数据收集
- **Open Source**: MIT 许可证，符合开源标准
- **Security**: 定期依赖更新和安全审计

#### Threat Model

- **Code Injection**: 通过 CSP 和上下文隔离防护
- **Privilege Escalation**: 最小权限原则和沙盒机制
- **Data Exfiltration**: 本地数据存储和加密传输

### Scalability & Reliability

#### Expected Load

- **用户规模**: 支持数千并发用户（开发者）
- **文件处理**: 支持大文件下载和处理（GB 级别）
- **插件数量**: 支持 50+ 插件并发运行

#### Availability Requirements

- **本地可用性**: 99.9% 离线可用性
- **更新可用性**: 99% 更新服务可用性
- **恢复时间**: 应用崩溃恢复时间 < 10秒

#### Growth Projections

- **功能扩展**: 模块化架构支持功能横向扩展
- **性能扩展**: 多进程架构支持性能纵向扩展
- **生态扩展**: 插件系统支持第三方开发者扩展

## Technical Decisions & Rationale

### Decision Log

#### 1. **Electron + Vue 3 + TypeScript 技术栈选择**

**决策原因**:

- Electron 提供跨平台能力，无需为每个平台单独开发
- Vue 3 Composition API 提供更好的逻辑复用和类型推导
- TypeScript 确保代码质量和开发效率
- 生态系统成熟，社区支持良好

**考虑的替代方案**: Tauri (Rust), Neutralino.js, PWA
**权衡**: 选择成熟度和生态系统优势，接受较大的应用体积

#### 2. **Vite 作为构建工具**

**决策原因**:

- 极快的开发服务器启动和热重载
- 原生 ES 模块支持，更好的开发体验
- 优秀的 Vue 3 和 TypeScript 支持
- 现代化的插件生态系统

**考虑的替代方案**: Webpack, Rollup, Parcel
**权衡**: 优先考虑开发体验，接受相对较新的技术栈

#### 3. **IPC 路由系统的自动化类型生成**

**决策原因**:

- 消除手动维护类型定义的错误风险
- 提供完整的 IDE 智能提示和类型检查
- 简化 API 调用，提高开发效率
- 支持重构时的自动类型更新

**实现方式**: 使用 ts-morph 分析源码并生成类型定义
**权衡**: 增加构建复杂度，获得类型安全和开发体验提升

#### 4. **Pinia 状态管理选择**

**决策原因**:

- Vue 3 官方推荐的状态管理解决方案
- 更好的 TypeScript 支持和类型推导
- Composition API 风格，与 Vue 3 一致
- 更小的打包体积和更好的 Tree-shaking

**考虑的替代方案**: Vuex 4, Zustand
**权衡**: 选择官方支持和长期维护保证

#### 5. **插件系统架构设计**

**决策原因**:

- 提供可扩展性，支持第三方开发
- 沙盒化插件执行，确保安全性
- 标准化插件 API，降低开发门槛
- 动态加载机制，支持按需安装

**架构选择**: 基于 Electron 的多进程隔离
**权衡**: 增加系统复杂度，获得安全性和扩展性

## Known Limitations

### 技术债务和限制

#### 1. **应用体积较大**

**影响**: Electron 应用包含完整的 Chromium 运行时，基础体积约 100-150MB
**未来解决方案**:

- 考虑 Tauri 等更轻量级的替代方案
- 优化依赖包，移除不必要的库
- 使用代码分割和懒加载技术

#### 2. **内存使用相对较高**

**影响**: 多进程架构和 Chromium 运行时导致内存占用较高
**现状原因**: Electron 架构特性，为了跨平台兼容性的权衡
**优化计划**:

- 实现内存使用监控和优化
- 优化插件加载策略
- 考虑进程复用机制

#### 3. **安全模型复杂性**

**影响**: Context Isolation 和 IPC 安全配置增加开发复杂度
**现状原因**: Electron 安全最佳实践要求
**改进方向**:

- 提供更完善的安全配置模板
- 自动化安全检查工具
- 简化安全配置的开发体验

#### 4. **插件系统的沙盒限制**

**影响**: 插件能力受到沙盒环境限制，某些系统 API 不可用
**设计权衡**: 安全性优先，限制插件的系统访问能力
**未来扩展**:

- 提供更丰富的受控 API
- 分级权限管理系统
- 用户可控的权限授权机制

#### 5. **跨平台样式一致性**

**影响**: 不同操作系统的原生样式差异可能影响用户体验
**现状处理**: 使用 TailwindCSS 统一样式系统
**持续改进**:

- 平台特定的样式适配
- 原生控件集成
- 无障碍访问性改进
