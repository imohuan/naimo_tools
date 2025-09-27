# 任务文档

## 窗口管理重构任务分解

### 阶段一：核心类型定义和接口

- [-] 1. 创建窗口管理核心类型定义
  - 文件: `src/renderer/src/typings/window-types.ts`
  - 定义 ViewConfig, LifecycleStrategy, ViewState 等核心接口
  - 扩展现有的窗口类型定义
  - 目的: 为新窗口管理系统建立类型安全基础
  - _复用: src/renderer/src/typings/window.ts_
  - _需求: 需求 1, 需求 7_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：TypeScript 专家，专精类型系统和 Electron 应用开发 | 任务：为窗口管理重构创建核心类型定义，包括 ViewConfig、LifecycleStrategy、ViewState、DetachedWindowConfig 和 MainWindowLayout 接口，遵循需求 1 和 7，扩展现有窗口类型 | 限制：不修改现有类型定义，保持向后兼容，遵循项目命名约定 | 成功标准：所有接口编译无错误，正确继承现有类型，完整覆盖窗口管理需求 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 2. 扩展主进程窗口类型定义
  - 文件: `src/main/config/window-types.ts`
  - 为 BaseWindow 和 WebContentsView 创建类型定义
  - 定义主进程窗口管理接口
  - 目的: 支持主进程的新窗口管理架构
  - _复用: src/main/config/window-manager.ts_
  - _需求: 需求 1, 需求 7_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：主进程开发专家，专精 Electron 主进程和窗口管理 | 任务：扩展主进程窗口类型定义，为 BaseWindow 和 WebContentsView 创建类型定义，遵循需求 1 和 7 | 限制：必须与现有 WindowManager 兼容，不破坏现有窗口功能 | 成功标准：新类型定义完整支持 BaseWindow/WebContentsView，与现有系统兼容 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

### 阶段二：主进程窗口管理器

- [ ] 3. 创建 BaseWindowController
  - 文件: `src/main/config/BaseWindowController.ts`
  - 实现 BaseWindow 的创建和基本属性控制
  - 集成现有的窗口配置系统
  - 目的: 提供 BaseWindow 的底层控制能力
  - _复用: src/main/config/window.config.ts, src/main/config/window-manager.ts_
  - _需求: 需求 1, 需求 2_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：Electron 主进程专家，专精 BaseWindow API 和窗口管理 | 任务：创建 BaseWindowController 类，实现 BaseWindow 的创建和基本属性控制，集成现有窗口配置，遵循需求 1 和 2 | 限制：必须保持与现有窗口系统的兼容性，不破坏现有功能 | 成功标准：BaseWindow 创建和管理功能完整，与现有配置系统集成良好 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 4. 创建 ViewManager
  - 文件: `src/main/config/ViewManager.ts`
  - 实现 WebContentsView 的创建、切换和布局管理
  - 支持视图的显示/隐藏和边界计算
  - 目的: 管理 WebContentsView 的生命周期和布局
  - _复用: 参考.js 中的视图管理逻辑_
  - _需求: 需求 4, 需求 5.1_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：Electron 视图管理专家，专精 WebContentsView API | 任务：创建 ViewManager 类，实现 WebContentsView 的创建、切换和布局管理，遵循需求 4 和 5.1，参考参考.js | 限制：必须确保视图切换的性能，正确处理视图边界和生命周期 | 成功标准：视图创建、切换、布局管理功能完整，性能良好 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 5. 创建 LifecycleManager
  - 文件: `src/main/config/LifecycleManager.ts`
  - 实现视图生命周期策略（前台/后台）
  - 管理插件的后台运行和内存清理
  - 目的: 智能管理视图的生命周期和资源
  - _复用: 现有插件生命周期逻辑_
  - _需求: 需求 5, 需求 8_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：系统架构师，专精生命周期管理和内存优化 | 任务：创建 LifecycleManager 类，实现视图生命周期策略和智能资源管理，遵循需求 5 和 8 | 限制：必须正确处理插件的后台运行，避免内存泄漏 | 成功标准：生命周期策略正确执行，内存管理高效，插件后台运行稳定 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 6. 创建 DetachManager
  - 文件: `src/main/config/DetachManager.ts`
  - 实现视图分离到独立窗口的逻辑
  - 支持 Alt+D 快捷键和控制栏
  - 目的: 处理窗口分离和独立窗口管理
  - _复用: 参考.js 中的分离逻辑, src/main/ipc-router/modules/window.ts_
  - _需求: 需求 6_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：Electron 窗口专家，专精窗口分离和快捷键处理 | 任务：创建 DetachManager 类，实现视图分离功能和独立窗口管理，遵循需求 6，参考参考.js 和现有窗口模块 | 限制：必须正确处理快捷键事件，确保分离窗口的完整功能 | 成功标准：Alt+D 分离功能正常，独立窗口具有控制栏和完整功能 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 7. 创建新 WindowManager 主类
  - 文件: `src/main/config/NewWindowManager.ts`
  - 统一管理所有窗口和视图操作
  - 集成 BaseWindowController、ViewManager、LifecycleManager、DetachManager
  - 目的: 提供统一的窗口管理接口
  - _复用: src/main/config/window-manager.ts_
  - _需求: 需求 7_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：系统集成专家，专精模块整合和架构设计 | 任务：创建 NewWindowManager 主类，统一管理所有窗口和视图操作，集成所有子管理器，遵循需求 7 | 限制：必须提供清晰的公共接口，正确协调各子管理器 | 成功标准：统一接口功能完整，各子管理器集成良好，架构清晰 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

### 阶段三：IPC 路由扩展

- [ ] 8. 扩展 IPC 窗口模块
  - 文件: `src/main/ipc-router/modules/window.ts` (修改现有)
  - 添加新窗口管理 API 的 IPC 路由
  - 集成 NewWindowManager
  - 目的: 为渲染进程提供新窗口管理能力
  - _复用: 现有 IPC 路由模式_
  - _需求: 需求 1, 需求 7_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：IPC 通信专家，专精 Electron 进程间通信 | 任务：扩展现有 IPC 窗口模块，添加新窗口管理 API 路由，遵循需求 1 和 7 | 限制：必须保持现有 IPC 接口的兼容性，遵循类型安全原则 | 成功标准：新 API 路由正确注册，类型安全，与现有系统兼容 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 9. 更新 custom-on.ts 窗口移动处理
  - 文件: `src/main/ipc-router/custom-on.ts` (修改现有)
  - 移除自定义窗口移动逻辑
  - 使用原生窗口拖拽
  - 目的: 简化窗口移动实现，使用原生能力
  - _复用: 现有事件处理模式_
  - _需求: 需求 1_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：Electron 事件处理专家 | 任务：更新 custom-on.ts，移除自定义窗口移动逻辑，使用原生窗口拖拽，遵循需求 1 | 限制：确保不破坏现有功能，平滑过渡到原生拖拽 | 成功标准：原生窗口拖拽正常工作，代码简化 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

### 阶段四：渲染进程组件重构

- [ ] 10. 创建 SearchHeaderManager
  - 文件: `src/renderer/src/core/window/SearchHeaderManager.ts`
  - 管理搜索头部区域的功能和状态
  - 集成原生拖拽能力
  - 目的: 提供搜索头部的统一管理
  - _复用: src/renderer/src/modules/search/components/SearchHeader.vue_
  - _需求: 需求 2, 需求 9_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：前端架构师，专精 Vue.js 和组件管理 | 任务：创建 SearchHeaderManager，管理搜索头部功能，集成原生拖拽，遵循需求 2 和 9 | 限制：必须保持现有搜索功能，确保原生拖拽正常工作 | 成功标准：搜索头部功能完整，原生拖拽流畅，状态管理清晰 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 11. 重构 App.vue 主组件
  - 文件: `src/renderer/src/App.vue` (重大修改)
  - 移除 DraggableArea 组件
  - 重构为固定搜索头部 + 动态内容区域
  - 集成新的窗口管理系统
  - 目的: 实现新的应用布局架构
  - _复用: 现有搜索和插件逻辑_
  - _需求: 需求 1, 需求 2_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：Vue.js 专家，专精组件重构和状态管理 | 任务：重构 App.vue 主组件，移除 DraggableArea，实现新布局架构，遵循需求 1 和 2 | 限制：必须保持现有功能的完整性，确保平滑过渡 | 成功标准：新布局正常工作，现有功能完整保留，用户体验良好 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 12. 移除 DraggableArea 组件
  - 文件: `src/renderer/src/components/DraggableArea.vue` (删除)
  - 清理相关引用和依赖
  - 更新其他使用该组件的地方
  - 目的: 清理不再需要的自定义拖拽代码
  - _复用: 无_
  - _需求: 需求 1_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：代码清理专家 | 任务：安全移除 DraggableArea 组件及其所有引用，遵循需求 1 | 限制：确保不破坏其他功能，彻底清理相关代码 | 成功标准：组件完全移除，无残留引用，应用正常运行 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 13. 更新 SearchHeader 组件
  - 文件: `src/renderer/src/modules/search/components/SearchHeader.vue` (修改)
  - 移除 DraggableArea 依赖
  - 使用原生窗口拖拽属性
  - 目的: 适配新的窗口管理架构
  - _复用: 现有搜索功能_
  - _需求: 需求 1, 需求 2_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：Vue.js 组件专家 | 任务：更新 SearchHeader 组件，移除 DraggableArea 依赖，使用原生拖拽，遵循需求 1 和 2 | 限制：保持现有搜索功能完整，确保拖拽体验良好 | 成功标准：组件正常工作，原生拖拽流畅，搜索功能完整 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

### 阶段五：设置和插件集成

- [ ] 14. 创建设置页面 WebContentsView
  - 文件: `src/renderer/src/pages/settings/` (新建目录和文件)
  - 创建独立的设置页面应用
  - 实现设置的 WebContentsView 加载
  - 目的: 将设置界面独立为 WebContentsView
  - _复用: 现有设置组件和逻辑_
  - _需求: 需求 3_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：前端应用架构师，专精模块化应用设计 | 任务：创建独立的设置页面应用，支持 WebContentsView 加载，遵循需求 3 | 限制：必须保持设置功能的完整性，确保数据同步 | 成功标准：设置页面独立运行，WebContentsView 加载正常，功能完整 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 15. 更新插件窗口创建逻辑
  - 文件: `src/main/ipc-router/modules/window.ts` (修改 createWebPageWindow)
  - 使用 WebContentsView 替代独立 BrowserWindow
  - 适配新的窗口管理架构
  - 目的: 让插件使用新的视图管理系统
  - _复用: 现有插件创建逻辑_
  - _需求: 需求 4, 需求 5_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：Electron 插件系统专家 | 任务：更新插件窗口创建逻辑，使用 WebContentsView 替代 BrowserWindow，遵循需求 4 和 5 | 限制：必须保持插件 API 兼容性，确保插件功能完整 | 成功标准：插件在 WebContentsView 中正常运行，API 兼容 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 16. 实现插件生命周期集成
  - 文件: `src/renderer/src/core/plugin/PluginManager.ts` (修改)
  - 集成新的生命周期管理
  - 支持后台运行和前台模式切换
  - 目的: 适配新的插件生命周期管理
  - _复用: 现有插件管理逻辑_
  - _需求: 需求 5, 需求 8_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：插件架构专家，专精生命周期管理 | 任务：集成新的插件生命周期管理，支持后台运行，遵循需求 5 和 8 | 限制：必须保持插件数据的一致性，正确处理状态转换 | 成功标准：插件生命周期管理正确，后台运行稳定 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

### 阶段六：快捷键和分离功能

- [ ] 17. 实现 Alt+D 分离功能
  - 文件: `src/renderer/src/core/window/DetachHandler.ts` (新建)
  - 处理分离快捷键事件
  - 与主进程的 DetachManager 通信
  - 目的: 实现视图分离的前端控制
  - _复用: 现有快捷键系统_
  - _需求: 需求 6_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：前端交互专家，专精快捷键处理 | 任务：实现 Alt+D 分离功能的前端处理，与主进程通信，遵循需求 6 | 限制：确保快捷键不冲突，分离操作流畅 | 成功标准：Alt+D 快捷键正常响应，分离功能完整 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 18. 创建分离窗口控制栏
  - 文件: `src/renderer/src/pages/detached-window/` (新建目录和文件)
  - 创建分离窗口的控制栏界面
  - 实现窗口控制功能（关闭、最小化等）
  - 目的: 为分离窗口提供控制界面
  - _复用: 现有窗口控制逻辑_
  - _需求: 需求 6_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：UI/UX 开发专家 | 任务：创建分离窗口控制栏界面，实现窗口控制功能，遵循需求 6 | 限制：界面应简洁实用，不影响插件内容显示 | 成功标准：控制栏功能完整，界面美观实用 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

### 阶段七：测试和集成

- [ ] 19. 创建窗口管理单元测试
  - 文件: `tests/unit/window-management/` (新建目录)
  - 测试各个窗口管理类的功能
  - 覆盖错误处理场景
  - 目的: 确保窗口管理功能的可靠性
  - _复用: 现有测试工具和模式_
  - _需求: 所有需求_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：QA 工程师，专精单元测试 | 任务：创建窗口管理系统的单元测试，覆盖所有功能和错误场景 | 限制：确保测试隔离性，覆盖率达到 80% 以上 | 成功标准：所有测试通过，代码覆盖率良好 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 20. 创建集成测试
  - 文件: `tests/integration/window-management/` (新建目录)
  - 测试窗口-视图协作
  - 测试插件集成流程
  - 目的: 验证系统各组件的协作
  - _复用: 现有集成测试框架_
  - _需求: 所有需求_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：集成测试专家 | 任务：创建窗口管理系统的集成测试，验证组件协作 | 限制：测试真实用户场景，确保稳定性 | 成功标准：所有集成测试通过，用户场景验证完整 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_

- [ ] 21. 端到端测试和最终集成
  - 文件: `tests/e2e/window-management/` (新建目录)
  - 测试完整的用户工作流
  - 验证窗口分离、插件切换等场景
  - 清理代码和文档
  - 目的: 确保整个系统正常工作
  - _复用: 现有 E2E 测试框架_
  - _需求: 所有需求_
  - _提示: 实施 window-management-refactor 规范的任务，首先运行 spec-workflow-guide 获取工作流指南，然后实施任务：角色：高级测试工程师，专精端到端测试 | 任务：创建完整的端到端测试，验证所有用户工作流，完成最终集成 | 限制：测试覆盖所有关键用户场景，确保产品质量 | 成功标准：所有 E2E 测试通过，系统满足所有需求，代码质量良好 | 说明：在 tasks.md 中将此任务标记为进行中 [-]，完成后标记为已完成 [x]_
