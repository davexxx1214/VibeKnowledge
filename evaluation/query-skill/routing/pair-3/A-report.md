## discovery

入口是 `/auth/cli/authorize`，路由名 `CLIAuthAuthorize`，直接加载 `CLIAuthAuthorizeView.vue`，只声明 `requiresAuth: true`，没有管理员或超级管理员要求。已正常登录的普通账号符合前端访问条件；这是前端放行条件，不证明后端授权策略。（`web/src/router/index.js:36-41`、`web/src/router/index.js:157-185`、`web/src/router/index.js:187-223`）

路由守卫遇到已有 token 但没有 userId 时，先调用 `getCurrentUser()`；它以 Bearer 头请求 `/api/auth/me` 并填充用户信息。失败会 logout，然后需要认证但未登录的访问会将包含查询参数的 `to.fullPath` 保存到 `sessionStorage.redirect`，转往 `/login`。登录状态本身按 token 是否非空计算，不是管理员角色判断。（`web/src/router/index.js:165-184`、`web/src/stores/user.js:7-20`、`web/src/stores/user.js:309-336`、`web/src/stores/user.js:142-145`）

授权码来自 URL 的 `route.query.user_code`，不是本页生成、不是文本输入，也不是从会话响应中取出。页面用 `String(route.query.user_code || '').trim().toUpperCase()` 转成字符串、去除两端空白、转大写；显示及两次 API 调用使用该值。API 层再用 `encodeURIComponent` 将其作为路径段编码。这里没有进一步的格式或长度校验。（`web/src/views/CLIAuthAuthorizeView.vue:22`、`web/src/views/CLIAuthAuthorizeView.vue:64-68`、`web/src/apis/auth_api.js:83-90`）

页面加载链路：初始 `loading=true`、`approved=false`、`session=null`；挂载时执行 `loadSession()`。缺少规范化后的授权码会显示“缺少 CLI 授权码”，结束加载且不发出会话请求；否则调用 `getCLIAuthSession(userCode)`，发送 `GET /api/auth/cli/sessions/{编码后的授权码}`，把返回值直接存入 session，最后结束 loading。界面展示授权码、`session.key_name`（缺省 `Yuxi CLI`）、`session.status`（缺省 `-`）、`session.expires_at`（缺省 `-`）和确认按钮。过期时间是直接展示值，没有倒计时或本地到期校验；状态也仅展示，加载到某个状态并不会自行设置 approved 或禁用按钮。本组件只在挂载时加载，没有轮询或对查询参数变化的重新加载监听。（`web/src/views/CLIAuthAuthorizeView.vue:21-45`、`web/src/views/CLIAuthAuthorizeView.vue:58-84`、`web/src/views/CLIAuthAuthorizeView.vue:98`、`web/src/apis/auth_api.js:83-85`、`web/src/apis/base.js:153-155`）

点击“确认授权”触发 `approveSession()`：设置 `approving=true`，调用 `approveCLIAuthSession(userCode)`，发送 `POST /api/auth/cli/sessions/{编码后的授权码}/approve`，JSON 请求体是 `{}`，按钮绑定 approving 显示加载状态。请求没有传凭据名称、用户 ID 或密码；确认成功后不读取响应业务字段，直接设置 `approved=true`，最后取消按钮加载状态。（`web/src/views/CLIAuthAuthorizeView.vue:43-44`、`web/src/views/CLIAuthAuthorizeView.vue:86-95`、`web/src/apis/auth_api.js:88-90`、`web/src/apis/base.js:176-186`）

两次调用使用普通 `apiGet`/`apiPost`，不是管理员封装；其默认 `requiresAuth=true`。基础封装先检查 `userStore.isLoggedIn`，未登录即抛“用户未登录”，否则合并 `getAuthHeaders()` 的 `Authorization: Bearer ${token.value}`，并设置 JSON Content-Type 后 fetch。token 从本地 `user_token` 初始化；网页登录成功时使用响应的 `access_token` 更新 store 并保存。因此显式携带的是当前网页会话 token，而非授权码充当身份令牌或新 API Key。（`web/src/apis/auth_api.js:83-90`、`web/src/apis/base.js:17-40`、`web/src/apis/base.js:153-159`、`web/src/apis/base.js:176-185`、`web/src/stores/user.js:7`、`web/src/stores/user.js:49-63`、`web/src/stores/user.js:142-145`）

显示优先级是错误提示、加载转圈、成功结果或会话摘要。加载失败显示 `error.message` 或“获取 CLI 授权会话失败”；确认失败显示 `error.message` 或“确认 CLI 授权失败”。由于错误分支在最前，两类错误均替代摘要与确认按钮，本页没有重试按钮或清除错误的流程。确认请求正常返回并完成响应读取后，摘要替换为“已授权 / 可以关闭此页面并回到终端。”，没有自动关闭窗口或回到终端。（`web/src/views/CLIAuthAuthorizeView.vue:9-21`、`web/src/views/CLIAuthAuthorizeView.vue:70-98`、`web/src/apis/base.js:122-141`）

公共请求封装对非成功 HTTP 响应解析 `detail.message`、`detail.error`、字符串 detail 或 message 等错误；401 会显示重新登录提示、清除当前登录状态并在 1500 毫秒后跳转 `/login`，403 改为“没有权限执行此操作”，500 改为服务器内部错误提示，再抛回页面处理。网络或响应读取异常也向上传递。logout 清除本地 token 和用户状态。（`web/src/apis/base.js:42-119`、`web/src/apis/base.js:137-141`、`web/src/stores/user.js:72-89`）

“以你当前的身份创建一个 API Key 并返回给终端”是页面警告文案描述的承诺。此链路的前端实际做到：查询现有 CLI 授权会话、携带当前网页身份提交 approve 请求、在请求正常返回后显示授权成功。确认函数没有接收或保存返回的 Key，没有调用独立 Key 创建接口，没有把 Key 发送给终端，也没有验证终端已经收到它。后端是否创建 Key、如何绑定会话、终端如何取回、是否真正收到，均不能由这些前端代码证明；不应把本地 approved 状态等同于整个终端登录已完成。（`web/src/views/CLIAuthAuthorizeView.vue:14-18`、`web/src/views/CLIAuthAuthorizeView.vue:23-27`、`web/src/views/CLIAuthAuthorizeView.vue:86-98`、`web/src/apis/auth_api.js:83-90`）

## control

1. `userStore.isAdmin === false` 时，`normalizeTab('mcp')` 返回 `'skills'`。非管理员的标签列表只有 skills，因此允许键不包含 mcp；函数回退到标签列表首项，即 skills。（`web/src/views/ExtensionsView.vue:57-64`）

   `userStore.isAdmin === true` 时，`normalizeTab(['skills', 'mcp'])` 返回 `'knowledge'`。管理员允许键为字符串 knowledge、tools、mcp、skills；`includes(tab)` 检查的是整个传入数组是否为其中一个元素，不会遍历数组寻找第一个可用标签，也不会取数组首项。因此不命中，回退到管理员标签列表首项 knowledge。（`web/src/views/ExtensionsView.vue:51-64`）

2. 管理员默认标签是 knowledge。当前 `route.query` 为 `{ tab: 'mcp', q: 'needle' }` 时，独立执行 `replaceTabQuery('knowledge')` 会先浅复制整个 query，再因参数等于默认标签而删除副本的 tab，最后调用 `router.replace({ query: { q: 'needle' } })`，不是 router.push。其他查询字段被展开复制并保留；函数没有直接改写原 route.query，也没有传 path 参数。（`web/src/views/ExtensionsView.vue:51-60`、`web/src/views/ExtensionsView.vue:67-75`）
## followup

在最初未登录、没有旧回跳记录的前提下，打开 `/auth/cli/authorize?user_code=...` 会被认证守卫拦截：将目标 `to.fullPath` 写入 `sessionStorage.redirect`，然后进入 `/login`。保存的是完整前端路由目标（路径、查询参数及可能的 hash），而非只存授权码，也不是连同站点 origin 的绝对 URL；因此原 `user_code` 查询参数随目标保留。两条成功登录路径都从该浏览器会话记录恢复目标，不要求登录页 URL 自己带上授权码。（`web/src/router/index.js:36-40`、`web/src/router/index.js:159-184`）

账号密码路径：登录表单的 `handleLogin()` 调用 `userStore.login({ loginId, password })`。store 将登录标识以 `username` 字段、密码以 `password` 字段放入 FormData，POST `/api/auth/token`；正常响应后用 `data.access_token` 设置 token、用 `data.user_id` 设置 userId，并更新用户名、uid、角色等用户资料，同时将 token 写入 `localStorage.user_token`。`isLoggedIn` 由 token 非空得到，所以登录状态是在 store 的 login 成功分支建立。随后登录页读取 `sessionStorage.redirect`，立即删除该记录；这里保存的是授权页而不是 `/`，故执行 `router.push(redirectPath)` 回到带原查询参数的授权页。（`web/src/views/LoginView.vue:426-465`、`web/src/stores/user.js:18`、`web/src/stores/user.js:23-65`）

手动 OIDC 路径：已启用且完成配置检查后显示的按钮绑定 `handleOIDCLogin()`。它不调用账号密码的 `userStore.login()`，而是先无参数调用 `authApi.getOIDCLoginUrl()`；拿到 `response.login_url` 后，按 `sessionStorage.redirect`、登录页 query.redirect、`/` 的优先级选择目标，将其写入 `sessionStorage.oidc_redirect`，最后用 `window.location.href = response.login_url` 离开页面。在本题初始条件下，oidc_redirect 保存的就是认证守卫留下的完整授权页路由。（`web/src/views/LoginView.vue:219-242`、`web/src/views/LoginView.vue:503-522`）

OIDC 发起请求的服务端回跳参数与浏览器记录不同：`getOIDCLoginUrl(redirectPath = '/')` 将参数放入 `URLSearchParams({ redirect_path: redirectPath })`，请求 `/api/auth/oidc/login-url?redirect_path=%2F`。手动处理函数没有把之前的 CLI 目标传给它，因此服务端收到的是默认 `/`，浏览器 oidc_redirect 保存的则是 `/auth/cli/authorize?user_code=...`。不能因为两处都称“redirect”就认定前端已经将原授权页目标传给这个服务端请求。（`web/src/apis/auth_api.js:36-43`、`web/src/views/LoginView.vue:513-519`）

OIDC 回调入口为 `/auth/oidc/callback`，声明 `meta.public: true`、没有 requiresAuth。按本题未登录且回调成功的条件，组件挂载时进入 `handleCallback()`，要求 URL 的 `code` 是非空字符串，调用 `exchangeOIDCCode(code)`，以 JSON `{ code }` POST `/api/auth/oidc/exchange-code`。这个 API 函数直接 fetch，仅显式设置 JSON Content-Type，没有调用附加 Bearer 的通用认证封装。交换成功后，先 `router.replace({ path: route.path, query: {} })` 清掉回调查询参数，再由回调组件直接把响应写入 userStore，并写入 `localStorage.user_token`，从而建立网页登录状态。实际赋值是 token=`tokenData.access_token`、userId=`tokenData.uid`（与密码登录的 data.user_id 不同）、uid=`tokenData.uid || ''`，角色缺省为 `user`，其余资料也在此更新。（`web/src/router/index.js:30-34`、`web/src/views/OIDCCallbackView.vue:53-83`、`web/src/views/OIDCCallbackView.vue:119-127`、`web/src/apis/auth_api.js:66-80`、`web/src/stores/user.js:18`）

随后回调组件读取 `sessionStorage.oidc_redirect`，删除它并清理 OIDC 自动发起尝试标记；500 毫秒后，对本题非 `/` 的目标执行 `router.push(redirectPath)`，回到原授权页。清理的实际差异是：密码登录删除原始 `redirect`；手动 OIDC 发起仅复制它，没有删除，成功回调删除的是 `oidc_redirect`，`clearAutoStartAttempt()` 也只删除 `oidc_auto_start_attempted`。因此本题密码路径结束后原 redirect 已消费，OIDC 路径结束后原 redirect 仍留在 sessionStorage；清除回调 URL 的 code 不会清除这一记录。（`web/src/views/LoginView.vue:450-465`、`web/src/views/LoginView.vue:517-522`、`web/src/views/OIDCCallbackView.vue:69`、`web/src/views/OIDCCallbackView.vue:88-109`、`web/src/utils/oidcAutoStart.js:1`、`web/src/utils/oidcAutoStart.js:32-33`）

两个码用途不同：OIDC 回调的 `query.code` 是用来交换网页登录结果的登录 code，交换后从回调 URL 清除；原 `query.user_code` 是 CLI 授权会话的查找与确认标识，通过保存的授权页路由保留，返回该页面后才用于 CLI sessions 接口。前端没有将它们互换或从登录 code 推导 CLI 授权码的逻辑。两种登录成功都只恢复网页登录身份并回到授权页，不会自动调用 CLI approve；仍需用户在授权页点击“确认授权”。后端如何签发登录凭据、CLI 授权后终端如何取回凭据，不由该登录往返实现证明。（`web/src/views/OIDCCallbackView.vue:56-69`、`web/src/apis/auth_api.js:66-90`、`web/src/views/LoginView.vue:450-465`、`web/src/views/OIDCCallbackView.vue:88-109`、`web/src/views/CLIAuthAuthorizeView.vue:43-44`、`web/src/views/CLIAuthAuthorizeView.vue:64-98`）
