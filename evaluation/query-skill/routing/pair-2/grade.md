# 匿名独立评分

依据 tasks.md、rubric.md、rubric.json 及真实前端源码逐项核对。仅评价 X.md、Y.md 各阶段最终结论的准确性、完整性与源码可追溯性；不评价篇幅、工具或推测的分析方法。不因范围外细节缺失扣分，等价准确表述按完整回答处理。

以下源码路径均相对于实际读取的源码快照根目录：
`D:/workspace/VibeKnowledge/.vscode-test/feature-routing-dLeIF4/snapshot/`。
表中行号均已对照真实源码，而非仅采用评分规则给出的摘要。

## X

| ID | 得分 | 评分理由及真实源码依据 |
| --- | ---: | --- |
| D1 | 1 | 正确定位 CLIAuthAuthorizeView.vue 与 /auth/cli/authorize，明确仅 requiresAuth、无管理员或超级管理员要求，普通已登录用户符合前端访问条件；登录判定及获取资料失败登出的补充亦准确。依据：web/src/router/index.js:36-41、157-185、187-215；web/src/stores/user.js:7-20、309-336。报告附有支持这些结论的行号。 |
| D2 | 1 | 正确给出 route.query.user_code 经 String(... || '')、trim、toUpperCase 处理，并说明挂载加载、空码报错且停止加载、不发请求；没有误称严格格式校验。依据：web/src/views/CLIAuthAuthorizeView.vue:64-84、98。 |
| D3 | 1 | 完整追踪编码后的 GET 会话与 POST approve、JSON 空对象请求体、普通 apiGet/apiPost 默认认证及当前 store token 的 Bearer 头；正确排除管理员专用封装与请求体身份字段。依据：web/src/views/CLIAuthAuthorizeView.vue:78、86-90；web/src/apis/auth_api.js:83-91；web/src/apis/base.js:17-40、153-159、176-191；web/src/stores/user.js:7、49-63、142-145。 |
| D4 | 1 | 正确说明 key_name/status/expires_at 展示及回退值、approved 初值与仅在确认正常完成后置 true、成功结果替换摘要和按钮。明确区分 session.status 与本地 approved，并说明确认返回值被丢弃、API Key 创建与交付只是文案所述而非此组件实现。依据：web/src/views/CLIAuthAuthorizeView.vue:14-45、58-62、76-95；web/src/apis/auth_api.js:83-91。 |
| D5 | 1 | 区分初始 loading 与确认 approving，正确说明两条异常的 error.message/各自回退文案、各自 finally 停止忙碌状态，以及顶层错误替代其他页面内容。额外 HTTP 错误处理亦与源码相符。依据：web/src/views/CLIAuthAuthorizeView.vue:9-21、43-45、70-95；web/src/apis/base.js:43-119、125-141。 |
| F1 | 1 | 正确说明守卫保存 to.fullPath 至 sessionStorage.redirect 后返回 /login，原 user_code 查询参数随完整站内目标保存，不是 pathname 或登录页 query 传递。依据：web/src/router/index.js:36-41、159、180-185。 |
| F2 | 1 | 正确说明 LoginView 调用 userStore.login、FormData username 来自 loginId 及 password、POST /api/auth/token、成功更新 store 并持久化 user_token，随后读取并删除 redirect、push 本题非根目标。依据：web/src/views/LoginView.vue:442-465；web/src/stores/user.js:18、23-33、49-65。 |
| F3 | 1 | 明确手动调用 getOIDCLoginUrl() 无参，服务端 redirect_path 默认为 /（查询编码为 %2F）；收到 login_url 后依 redirect、路由 query.redirect、/ 的优先级另存 oidc_redirect 并外部导航，且明确默认 / 不同于浏览器保存的 CLI 目标。依据：web/src/views/LoginView.vue:504-522；web/src/apis/auth_api.js:36-43。 |
| F4 | 1 | 完整说明回调读取非空字符串 code、JSON POST 交换、清空回调 query、直接更新 userStore 并持久化 token、读取删除 oidc_redirect 并恢复非根目标；准确比较密码删除 redirect 而手动 OIDC 保留原 redirect。关于 userId 实际取 tokenData.uid 及自动标记清理的补充也正确。依据：web/src/router/index.js:30-35；web/src/views/OIDCCallbackView.vue:54-109、119-128；web/src/apis/auth_api.js:66-80；web/src/views/LoginView.vue:450-451、517-522；web/src/utils/oidcAutoStart.js:1、31-34。 |
| F5 | 1 | 区分 OIDC code 的网页登录交换用途与 CLI user_code 的会话定位/批准用途，明确回调 query 清理不删除保存目标中的 CLI 授权码；登录仅建立网页身份并回到目标，挂载只查询，仍需用户点击批准。依据：web/src/views/OIDCCallbackView.vue:56-83、89-109；web/src/views/LoginView.vue:450-465；web/src/apis/auth_api.js:66-91；web/src/views/CLIAuthAuthorizeView.vue:43-45、64-98。 |
| C1 | 1 | 两个返回值 skills、knowledge 均正确，解释角色允许字符串列表、includes 对整个数组入参匹配失败以及回退当前角色首项；未捏造数组解析。依据：web/src/views/ExtensionsView.vue:51-65。 |
| C2 | 1 | 正确给出 router.replace({ query: { q: 'needle' } })，说明浅复制、knowledge 为管理员默认项而删除 tab、保留 q；没有误称 push 或清空所有 query。依据：web/src/views/ExtensionsView.vue:51-60、67-75。 |

累计：discovery 5/5，followup 5/5，control 2/2，总分 **12/12**。

重大错误：无。未发现 M1-M5 或需要新增记录的重大错误断言。

## Y

| ID | 得分 | 评分理由及真实源码依据 |
| --- | ---: | --- |
| D1 | 1 | 正确定位顶层 CLI 授权路由及组件、仅 requiresAuth 而非管理员访问；准确指出 token 非空仅为前端登录判断，并未升级为服务端必然认可。依据：web/src/router/index.js:36-41、156-185、187-223；web/src/stores/user.js:7-20。报告行号足以追溯。 |
| D2 | 1 | 正确说明 query.user_code 的 String/trim/大写规范化、空码报错并关闭加载且不请求，以及挂载调用 loadSession；授权 URL 来源被恰当地限定为未知。依据：web/src/views/CLIAuthAuthorizeView.vue:22、64-84、98。 |
| D3 | 1 | 正确覆盖会话 GET、显式确认 POST、路径段编码、JSON {}，以及默认需认证的通用封装、当前 userStore token 的 Bearer 头与持久化来源。报告的“通用请求封装”准确表达了不是管理员专用 API。依据：web/src/views/CLIAuthAuthorizeView.vue:78、86-96；web/src/apis/auth_api.js:83-91；web/src/apis/base.js:17-40、153-159、176-191；web/src/stores/user.js:7、49-63、141-146。 |
| D4 | 1 | 完整说明三个会话展示字段与回退、GET 不代表批准、approved 初始 false 且不由 status 推导、POST 后成功结果替换详情按钮。明确组件未读取、保存、展示或传递 Key，并把签发、交付、过期及重复批准保证留给未提供的后端/CLI。依据：web/src/views/CLIAuthAuthorizeView.vue:13-45、58-62、70-98；web/src/apis/auth_api.js:83-91。 |
| D5 | 1 | 报告分别交代 GET 加载 spinner、确认按钮 approving 与提交结束恢复、两类异常的 error.message/回退文案，以及错误 alert 优先替代 spinner、成功和会话内容。结合其引用的加载与异常处理行号，忙碌状态和失败后的可见页面行为均可追溯；未逐字复述 GET finally 不构成此项核心事实的重要遗漏。依据：web/src/views/CLIAuthAuthorizeView.vue:9-21、43-45、58-84、86-96（两个 finally 分别在 81-83、93-95）。额外 HTTP 错误描述亦符合 web/src/apis/base.js:43-119。 |
| F1 | 1 | 正确描述 sessionStorage.redirect 保存含 user_code 的 to.fullPath 后转 /login，并排除仅 pathname、绝对 URL 或必须通过登录页 query 保存的误解。依据：web/src/router/index.js:36-41、159-184。 |
| F2 | 1 | 正确追踪表单至 userStore.login、FormData 字段及 token 接口、store/本地 token 更新，之后读取删除 redirect 并 push 原非根 CLI 目标。依据：web/src/views/LoginView.vue:155、426-465；web/src/stores/user.js:18、23-65。 |
| F3 | 1 | 正确指出手动无参调用导致服务端 redirect_path=/，完整描述客户端保存目标的优先级、另写 oidc_redirect 和 location.href 导航；明确两处回跳值不相同。依据：web/src/views/LoginView.vue:220-242、504-522；web/src/apis/auth_api.js:36-43。 |
| F4 | 1 | 正确说明公开回调路由、字符串 code 与 JSON POST 交换、清空回调 URL query、回调组件直接建立 store 登录态并持久化 token、消费 oidc_redirect 后导航；明确密码删除 redirect 而手动 OIDC 不删除。自动标记只删除 oidc_auto_start_attempted 的说明经源码验证正确。依据：web/src/router/index.js:30-35；web/src/views/OIDCCallbackView.vue:53-109、119-128；web/src/apis/auth_api.js:66-80；web/src/views/LoginView.vue:449-465、513-522；web/src/utils/oidcAutoStart.js:1、31-34。 |
| F5 | 1 | 正确区分两种 code 的接口和目的，说明 OIDC 清理的是回调 query，原 user_code 仍在恢复目标中；网页登录不自动完成 CLI 授权，仍由明确点击触发独立批准。依据：web/src/apis/auth_api.js:66-91；web/src/views/CLIAuthAuthorizeView.vue:43-45、60、64-98；web/src/views/OIDCCallbackView.vue:69、88-109。 |
| C1 | 1 | 非管理员 mcp 回退 skills、管理员数组入参回退 knowledge 均正确；includes 不取数组首项、不逐项查数组的依据准确。依据：web/src/views/ExtensionsView.vue:51-65。 |
| C2 | 1 | 正确给出 replace 调用及 query 参数，仅删除默认 tab、保留 q 与其他字段；浅拷贝和未显式设置 path/name 的描述符合局部函数。依据：web/src/views/ExtensionsView.vue:51-60、67-75。 |

累计：discovery 5/5，followup 5/5，control 2/2，总分 **12/12**。

重大错误：无。未发现 M1-M5 或需要新增记录的重大错误断言。

## 累计检查

每份报告均包含 rubric.items 的全部 12 个 ID；每项取允许值 1。各阶段相加为 5 + 5 + 2 = 12，X 与 Y 的总分均为 12，无额外扣分。grade.json 仅包含所要求的 X/Y、scores 和 majorFalseClaims 字段。

