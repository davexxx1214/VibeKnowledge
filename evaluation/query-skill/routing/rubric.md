# 评分规则

总分 12 分：discovery 5 分、followup 5 分、control 2 分。每项只取 0 / 0.5 / 1 分。

## 统一评分口径

- one：该项核心事实完整且正确，带能支持结论的源码路径及行号；等价措辞或额外但准确的相关说明均可。
- half：核心方向正确但有重要遗漏；或事实完整正确但没有可追溯源码行号。各项 partial 提供具体参考。
- zero：该项缺失、主要判断错误，或被该项内的重大错误断言推翻。
- aggregation：逐项相加。重大错误另行记录，并使直接受该断言影响的评分项为 0；不机械清零同一条重大错误列出的所有项，也不另扣总分，以免重复处罚。
- neutrality：仅评最终可追溯结论，不按工具、搜索/阅读顺序、文件读取数、耗时、token、篇幅或输出格式偏好给分。
- phases：按各阶段回应评分。followup 可引用 discovery 中已建立且有依据的事实，不要求复制旧结论；本阶段须增补登录往返事实。

## 关键评分项

### D1 · discovery · 1 分

完整正确标准：定位 CLIAuthAuthorizeView.vue 与 /auth/cli/authorize；该路由要求登录而未要求管理员，普通已登录用户不会因管理员守卫被拦。

0.5 分参考：只定位组件/路由或只正确说明前端访问条件，另一部分遗漏。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/CLIAuthAuthorizeView.vue:5-6`：用户可描述的页面标题
- `web/src/router/index.js:36-41`：路由、组件与 requiresAuth 元信息
- `web/src/router/index.js:157-185`：登录要求判定
- `web/src/router/index.js:187-215`：管理员及超级管理员限制仅按相应元信息触发

### D2 · discovery · 1 分

完整正确标准：授权码来自 route.query.user_code，先 String(... || '')、trim、toUpperCase；挂载时加载会话，空码时设置缺少授权码错误、结束 loading 并提前返回，不发会话请求。

0.5 分参考：来源与处理或空码/挂载行为中有一部分正确，但重要部分缺失；不得把它说成严格格式验证。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/CLIAuthAuthorizeView.vue:64-84`：授权码归一化、空码分支和加载
- `web/src/views/CLIAuthAuthorizeView.vue:98`：挂载触发加载

### D3 · discovery · 1 分

完整正确标准：加载调用 getCLIAuthSession，用编码后的授权码 GET /api/auth/cli/sessions/{code}；确认调用 approveCLIAuthSession，POST /api/auth/cli/sessions/{code}/approve，JSON 请求体为 {}。两者使用默认需认证的基础封装，认证头来自当前 userStore token 的 Bearer 值，非管理员专用 API。

0.5 分参考：两项请求大体正确但遗漏编码、请求体或认证来源之一，或只完整追踪其中一个请求。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/CLIAuthAuthorizeView.vue:76-90`：页面到 API 的调用
- `web/src/apis/auth_api.js:83-91`：编码、端点和空对象参数
- `web/src/apis/base.js:17-40`：默认认证及身份头合并
- `web/src/apis/base.js:153-159`：GET 默认认证与管理员封装的区别
- `web/src/apis/base.js:176-191`：POST 序列化、默认认证及管理员封装的区别
- `web/src/stores/user.js:7-18`：token 状态与登录判断
- `web/src/stores/user.js:141-146`：Bearer 头

### D4 · discovery · 1 分

完整正确标准：会话返回值用于展示 key_name/status/expires_at（含模板回退值）；确认请求完成后才把本地 approved 设为 true 并显示已授权、提示回终端。不能把 session.status 当成本地 approved 的来源；确认返回值未被该组件接收并转交 API Key，提示文字不是后端签发/传递实现的证据。

0.5 分参考：正确讲清展示与成功态，或正确限制 API Key 结论，但未同时覆盖；无需列出每个模板回退字符串。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/CLIAuthAuthorizeView.vue:14-45`：成功态、展示字段、API Key 提示和确认按钮
- `web/src/views/CLIAuthAuthorizeView.vue:58-62`：approved 初始为 false
- `web/src/views/CLIAuthAuthorizeView.vue:76-90`：会话赋值和确认成功后本地状态更新

### D5 · discovery · 1 分

完整正确标准：区分初次加载 loading 与确认提交 approving；加载/确认异常分别写入 errorMessage（优先 error.message，否则各自回退文案），finally 结束各自忙碌状态。模板优先显示错误提示，因此错误会替代加载/会话/成功内容，而不是仅额外弹出一条提示。

0.5 分参考：只解释一种请求的失败处理，或正确说明错误信息但未说明忙碌状态/模板互斥。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/CLIAuthAuthorizeView.vue:9-21`：顶层错误、加载与内容的互斥优先级
- `web/src/views/CLIAuthAuthorizeView.vue:43-45`：确认按钮 loading 绑定
- `web/src/views/CLIAuthAuthorizeView.vue:70-95`：两条请求的异常及 finally 处理

### F1 · followup · 1 分

完整正确标准：未登录访问同一受保护链接，守卫把 to.fullPath 存入 sessionStorage.redirect 并返回 /login；保存的是含授权码查询参数的完整前端目标，不是只保存 pathname，也不是直接把 CLI 链接作为登录页 query 传过去。

0.5 分参考：正确说明去登录页且有保存目标，但未说明保存位置或完整查询参数。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/router/index.js:36-41`：CLI 路由要求认证
- `web/src/router/index.js:180-185`：fullPath 的保存位置和登录导航

### F2 · followup · 1 分

完整正确标准：密码路径由 LoginView 调用 userStore.login；store 向 /api/auth/token POST FormData（username 来自 loginId、password），成功更新 token/用户状态并将 user_token 写入 localStorage。随后 LoginView 读取并删除 sessionStorage.redirect，再 push 原非根目标。

0.5 分参考：密码登录状态建立或目标恢复链路正确，但另一部分缺失；无需逐一枚举用户资料字段。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/LoginView.vue:442-465`：登录调用与回跳目标消费、删除和导航
- `web/src/stores/user.js:23-33`：密码登录请求及字段
- `web/src/stores/user.js:49-65`：成功后登录状态与 token 持久化

### F3 · followup · 1 分

完整正确标准：手动 OIDC 调用 getOIDCLoginUrl() 时没有传目标参数，因此 API 请求 /api/auth/oidc/login-url 的 redirect_path 是默认 /。收到 login_url 后，登录页按 sessionStorage.redirect、当前路由 query.redirect、/ 的优先级选目标，写 oidc_redirect，再用 window.location.href 去 login_url；本题保存的是原 CLI 完整链接，不能等同于请求给服务端的默认 /。

0.5 分参考：正确说明浏览器保存目标并跳身份提供方，或发现默认 / 与 CLI 目标的差异，但链路未完整。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/LoginView.vue:513-522`：无参数发起、浏览器保存目标的优先级与外部导航
- `web/src/apis/auth_api.js:36-43`：默认参数及 login-url 请求

### F4 · followup · 1 分

完整正确标准：OIDC 回调读取字符串 code，调用 exchangeOIDCCode，POST /api/auth/oidc/exchange-code 的 JSON {code}；成功后清掉回调 URL query，更新 userStore 登录状态并持久化 user_token。读取并移除 oidc_redirect，随后按已保存的非根目标导航；本题 OIDC 路径并未像密码路径那样删除原 redirect，需明确这项清理差异。

0.5 分参考：回调建立登录与恢复目标大体正确，但遗漏 code 交换/URL 清理或未准确比较 redirect 的清理；不要求点出延迟毫秒数或自动登录标记实现。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/router/index.js:30-35`：OIDC 回调路由
- `web/src/views/OIDCCallbackView.vue:54-91`：code 检查、交换、query 清理、登录状态和 oidc_redirect 的处理
- `web/src/views/OIDCCallbackView.vue:95-109`：延迟导航到非根目标
- `web/src/apis/auth_api.js:66-80`：code 交换 POST 的数据
- `web/src/views/LoginView.vue:450-451`：密码路径明确删除 redirect
- `web/src/views/LoginView.vue:517-522`：手动 OIDC 发起只读取 redirect、另写 oidc_redirect

### F5 · followup · 1 分

完整正确标准：区分 OIDC code 是本次网页登录交换用途，CLI user_code 是定位及确认命令行会话用途；回调清理的是回调页 query，CLI 授权码仍随保存的原目标返回。网页登录成功只让用户回到授权页；授权页挂载只加载会话，仍需显式确认按钮触发 approve，不会因为完成密码/OIDC 登录自动批准。

0.5 分参考：准确区分两种 code 或准确说明登录不自动批准，但未同时讲清两者及目标恢复。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/OIDCCallbackView.vue:54-69`：OIDC code 的用途及回调 query 清理
- `web/src/views/OIDCCallbackView.vue:89-109`：恢复已保存目标
- `web/src/views/LoginView.vue:450-465`：密码成功只导航到目标
- `web/src/views/CLIAuthAuthorizeView.vue:43-45`：按钮触发确认
- `web/src/views/CLIAuthAuthorizeView.vue:64-98`：CLI 授权码用途及挂载只加载会话
- `web/src/apis/auth_api.js:66-91`：两种 code 使用不同接口

### C1 · control · 1 分

完整正确标准：isAdmin=false 时 normalizeTab('mcp') 返回 skills；isAdmin=true 时 normalizeTab(['skills','mcp']) 返回 knowledge。includes 对整个入参做匹配，不取数组第一个元素；非法值回退当前角色标签列表第一项。

0.5 分参考：两个返回值中只答对一个，或两个值正确但缺少依据。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/ExtensionsView.vue:51-65`：角色标签列表、默认标签与直接 includes

### C2 · control · 1 分

完整正确标准：调用 router.replace({ query: { q: 'needle' } })：先浅复制 route.query，knowledge 是管理员默认项，所以删除 query.tab，保留 q；不是 push，也不是清空全部 query。

0.5 分参考：正确给出保留 q 并去掉 tab，或正确识别 replace，但调用参数/解释不完整。

0 分：缺失、主要错误，或本项受到重大错误断言推翻。1 分还要求可追溯证据。

源码依据：

- `web/src/views/ExtensionsView.vue:51-60`：管理员默认标签为 knowledge
- `web/src/views/ExtensionsView.vue:67-75`：复制 query、删除默认 tab、router.replace

## 重大错误定义

- M1：声称 CLI 页面需要管理员，或相关会话请求是匿名请求、无需当前登录身份。 关联项：D1、D3。依据：`web/src/router/index.js:36-41`；`web/src/apis/auth_api.js:83-91`；`web/src/apis/base.js:29-37`。

- M2：把提示文字当成已核实的实现，声称这个 Vue 组件生成 API Key、保存/展示具体密钥或直接转交密钥给终端；或捏造未包含的后端签发、轮询、过期保证。仅明确标注未知的推测不算。 关联项：D4。依据：`web/src/views/CLIAuthAuthorizeView.vue:26-27`；`web/src/views/CLIAuthAuthorizeView.vue:86-95`。

- M3：声称手动 OIDC 请求 login-url 时显式将原 CLI 链接传为 redirect_path，或声称密码与手动 OIDC 成功都删除 redirect 与 oidc_redirect 两条记录。 关联项：F3、F4。依据：`web/src/views/LoginView.vue:450-451`；`web/src/views/LoginView.vue:513-522`；`web/src/apis/auth_api.js:36-38`；`web/src/views/OIDCCallbackView.vue:89-91`。

- M4：把 OIDC 登录 code 与 CLI user_code 说成同一凭据/同一接口用途，或断言网页登录成功会自动调用命令行 approve。 关联项：F5。依据：`web/src/apis/auth_api.js:66-91`；`web/src/views/CLIAuthAuthorizeView.vue:43-45`；`web/src/views/CLIAuthAuthorizeView.vue:86-98`。

- M5：声称 normalizeTab 会解析查询数组并取第一个合法标签，或 replaceTabQuery 默认清空所有查询参数。 关联项：C1、C2。依据：`web/src/views/ExtensionsView.vue:62-75`。

遗漏本身不等于重大错误；额外但明确标为未知的内容不作错误断言处理。按直接受到错误影响的项目计 0，同时报告错误编号与候选原句；不另设惩罚分。

## 简要设计说明

- scope：已在隔离目录内检查真实前端源码；无需后端、二进制素材、运行项目、测试、外部资料或私有评测信息。
- boundedness：discovery 的核心链路涉及 5 个文件；followup 复用并新增 2 个页面；control 给定单个文件，仅需标签定义和两个相邻函数。合计 8 个核心文件，读取范围不是评分要求。
- stageRationale：discovery 从可见页面行为进入，不给实现文件；followup 在同一功能上改为未登录入口并比较两条成功回跳路径，不能仅复述首次页面结论；control 移除发现负担，仅判断一小段同步代码。
- coverage：任务中的每个分析问题均对应 D1-D5、F1-F5 或 C1-C2，sourceEvidence 给出源码路径与行号。故障只要求页面层处理，不要求枚举公共请求封装的所有 HTTP 错误。缺少后端源码时不得将界面提示升级为后端事实。
- protocol：候选只读分析并在会话内回答，不实施授权、登录或源文件修改。评测执行者分别投放 tasks.json 的三个值，不预泄露后续题目与答案。

核心文件（只是设计工作量说明，不是候选阅读策略要求）：

- `web/src/views/CLIAuthAuthorizeView.vue`
- `web/src/router/index.js`
- `web/src/apis/auth_api.js`
- `web/src/apis/base.js`
- `web/src/stores/user.js`
- `web/src/views/LoginView.vue`
- `web/src/views/OIDCCallbackView.vue`
- `web/src/views/ExtensionsView.vue`

