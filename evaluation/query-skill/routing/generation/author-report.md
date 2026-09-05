# 前端页面功能简报发布报告

已为指定五页发布通用功能简报，全部位于 `.vscode/.knowledge/feature-briefs/`，索引已确认包含五个条目。

| 页面 | 卡片 key | 事实数 | 发布器源文件指纹数 |
| --- | --- | ---: | ---: |
| ExtensionsView | `extensions-view` | 10 | 11 |
| WorkspaceView | `workspace-view` | 11 | 12 |
| LoginView | `login-view` | 11 | 11 |
| OIDCCallbackView | `oidc-callback-view` | 7 | 7 |
| CLIAuthAuthorizeView | `cli-auth-authorize-view` | 7 | 9 |

共 46 条带源码证据的事实。指纹数按卡片分别统计，共享源文件会重复计算。每份草稿位于 `.brief-authoring/drafts/<key>.json`；发布器生成对应卡片及 `index.json`，未手工编辑指纹或索引。

## 来源范围

仅在当前隔离目录中，通过 `node observe.cjs --phase author read ...` 或 `rg ...` 检查提供的前端文字源码。先完整读取 `.brief-authoring/INSTRUCTIONS.md`，未读取观察器或发布器实现。

- 共同入口与机制：`web/src/router/index.js`、`web/src/layouts/AppLayout.vue`、`web/src/main.js`、`web/package.json`、`web/src/stores/user.js`、`web/src/apis/base.js`。
- 智能体扩展：完整页面、`PageHeader`、`ToolsCardList`，以及 `McpCardList`、`SkillCardList`、`DataBaseView` 的相关职责/事件/API/导航实现；额外核对 `AgentRuntimeConfigForm` 的真实扩展页消费者。没有将子页的全部资源管理逻辑展开为主页事实。
- 工作区：页面模板和完整行为脚本、三个 `components/workspace/` 组件、`AgentFilePreview` 的编辑条件、`workspace_api`、`file_preview`、知识库可访问列表接口。覆盖来源分组、只读边界、分页/虚拟目录、上传/删除、预览请求新鲜度与 URL 清理、自适应预览和缓存生命周期。
- 登录：页面模板和行为脚本、用户 store 登录/初始化/首次运行部分、`info` store、认证 API、OIDC 自动发起工具、健康接口声明、智能体初始化片段和首页进入登录的入口。
- OIDC 回调：完整回调页、认证 code 交换及错误解析、用户状态定义、自动发起标记清理、发起端保存重定向的相关实现。
- CLI 确认：完整页面、CLI 会话读取/批准 API、通用认证请求及路由/登录返回链。

快照没有既有 `.vscode` 图谱，因此未复用图谱 group key；以真实路由、imports 和消费者检索为导航，采用稳定页面 key。

## 测试检索与验证

通过文件枚举发现提供快照中的六个测试文件，均在 `web/src/utils/__tests__/`：`svgRenderer.test.js`、`subagentThread.test.js`、`runStreamResume.test.js`、`pixelAvatar.test.js`、`messageProcessor.spec.js`、`htmlPreviewRenderer.test.js`。

在 `web/src` 的 `*.test.js`、`*.spec.js` 中检索五页名称、认证/工作区路由、`oidcAutoStart`、`auth_api`、`workspace_api`、`file_preview`、工作区组件、`AgentFilePreview`、扩展资源组件、`PageHeader`、用户状态和路由等引用，未找到直接相关测试命中。未把这些测试文件的存在写成页面覆盖，也未宣称整个仓库没有测试。未执行任何应用、构建或测试。

按要求串行调用预置发布器。四份草稿首次发布成功；工作区草稿的一条事实最初包含 7 个引用，超过发布器每事实 1–6 处的要求，将同文件的两个引用区间合并后成功发布。最终读取索引确认五份卡片的 key、关键词和入口文件记录。发布成功代表格式、路径、行号与指纹校验通过，不等同于运行时或语义正确性保证。

## 不确定性与边界

- 仅前端快照：后端、CLI 程序、依赖包、部署配置和图片未提供。未验证实际服务器响应、权限执行、登录、文件持久化或凭据交付。
- 版本均写为 `package.json` 声明范围，不当作安装版本。未联网查证或安装依赖。
- 认证、文件权限和 CLI 安全提示只描述可观察的前端机制/文案，不推断后端安全保证。
- 无相关测试命中只适用于上述提供文件与检索范围；未提供、其他仓库或间接覆盖仍未知。
- 未完整审计扩展详情编辑器、远程 Skill 安装协议、全部文件预览渲染器或其他页面。

本次仅写入五份草稿、五份发布卡片、索引、此报告以及工具自动观察日志；未修改业务源码，未安装、联网、运行应用或测试。
