## discovery

入口是 `/auth/cli/authorize?user_code=...`，路由名 `CLIAuthAuthorize`，懒加载 `CLIAuthAuthorizeView.vue`，是独立顶层页面。它只有 `requiresAuth: true`，没有管理员或超级管理员要求，因此题设中正常登录的普通账号满足前端访问条件。守卫在有 token 但尚无 userId 时先获取当前用户，失败会登出；需要登录但未登录时，把包含查询参数的 `to.fullPath` 存入 `sessionStorage.redirect`，转到 `/login`。前端的 `isLoggedIn` 判断仅为 token 非空，不代表服务端一定认可 token。（`web/src/router/index.js:36-41、156-185、187-223`；`web/src/stores/user.js:7-20`）

授权码直接来自当前路由查询参数 `route.query.user_code`，通过 `String(... || '')`、`trim()`、`toUpperCase()` 规范化，也以该结果显示在页面中。组件没有生成授权码或授权 URL 的逻辑；终端怎样生成、获取并打开该 URL，不能由这段前端证明。授权码为空时显示“缺少 CLI 授权码”，关闭加载状态且不发会话请求。（`web/src/views/CLIAuthAuthorizeView.vue:22、64-78`）

页面挂载时仅调用一次 `loadSession`，以规范化后的授权码调用 `getCLIAuthSession`；API 层再 `encodeURIComponent`，发出 `GET /api/auth/cli/sessions/{encodedUserCode}`，返回结果赋给 `session`。加载时显示 spinner；成功后显示授权码、凭据名称（缺省 `Yuxi CLI`）、状态和过期时间（后二者缺省 `-`），以及确认来源的警告和“确认授权”按钮。没有会话轮询或查询参数变化监听，显示的是本次加载结果。（`web/src/views/CLIAuthAuthorizeView.vue:9-45、57-84、98`；`web/src/apis/auth_api.js:83-86`）

点击按钮才执行 `approveSession`：先令 `approving = true` 使按钮进入 loading 状态，再调用 `approveCLIAuthSession`，发出 `POST /api/auth/cli/sessions/{encodedUserCode}/approve`，请求体为 JSON `{}`。请求成功返回后仅设置 `approved = true`；无论成功失败，最终恢复 `approving = false`。确认接口没有传入另一个账号、凭据名称或拟创建的 API Key。（`web/src/views/CLIAuthAuthorizeView.vue:43-45、86-96`；`web/src/apis/auth_api.js:88-91`；`web/src/apis/base.js:176-186`）

GET 和 POST 都走默认 `requiresAuth = true` 的通用请求封装：未登录会在 fetch 前抛出“用户未登录”，否则添加 `Authorization: Bearer ${token.value}`；非 FormData 请求还带 `Content-Type: application/json`。该 token 是浏览器当前用户 store 的 token，初始化读取 `localStorage.user_token`，密码登录后更新为服务端返回的 `access_token` 并持久化。因此“当前身份”在前端落实为当前网页登录 token 随两个请求发送，而不是使用授权码本身作为登录凭据。（`web/src/apis/base.js:17-40、153-155、176-186`；`web/src/stores/user.js:7、49-63、141-146`）

成功与失败的界面分支如下：

- GET 成功并不代表已批准：`approved` 初始为 false，不从 `session.status` 推导。确认按钮也没有根据 `status` 或 `expires_at` 禁用；是否允许过期、重复确认不能据此前端判断。（`web/src/views/CLIAuthAuthorizeView.vue:13-45、58-62、78、86-90`）
- POST 成功后，详情和按钮被成功结果替换，显示“已授权”“可以关闭此页面并回到终端。”，不会自动关闭页面或跳回终端。（`web/src/views/CLIAuthAuthorizeView.vue:13-21、86-96`）
- GET/POST 异常分别写入 `error.message`，缺省为“获取 CLI 授权会话失败”或“确认 CLI 授权失败”；顶层错误 alert 优先于 spinner、成功页和会话内容，因此失败后不再显示确认按钮。页面未提供重试、拒绝或撤销按钮；非本人请求的处理只是文案要求关闭页面。（`web/src/views/CLIAuthAuthorizeView.vue:9-47、79-95`）
- 通用封装还会处理 HTTP 错误：401 显示认证失败或登录过期提示、清除当前登录状态，并在 1500ms 后跳 `/login`；403 统一为“没有权限执行此操作”；500 统一为服务器内部错误提示；其他错误优先使用响应中的可读 detail/message，再抛回组件。（`web/src/apis/base.js:43-119`；`web/src/stores/user.js:72-89`）

“创建一个 API Key 并返回给终端”是页面警告中的承诺。这里真正实现到的步骤是：带当前网页身份读取 CLI 会话，用户显式确认后调用 approve 接口，并在该请求未抛错时展示成功。组件没有调用独立的 API Key 创建接口，没有读取批准响应中的 Key、显示/存储 Key，也没有向终端发送凭据的实现。API Key 是否实际创建、如何交付终端，以及会话过期和防重复批准，均需后端或 CLI 源码才能确认。（`web/src/views/CLIAuthAuthorizeView.vue:14-28、70-98`；`web/src/apis/auth_api.js:83-91`）

## control

1. `userStore.isAdmin === false` 时，`normalizeTab('mcp')` 返回 `'skills'`。普通用户标签仅有 `skills`，因此 `allowedTabKeys` 不包含 `mcp`，函数返回首个标签对应的 `defaultTabKey`，即 `skills`。（`web/src/views/ExtensionsView.vue:57-64`）

   `userStore.isAdmin === true` 时，`normalizeTab(['skills', 'mcp'])` 返回 `'knowledge'`。管理员允许项是字符串 `knowledge`、`tools`、`mcp`、`skills`；函数直接调用 `allowedTabKeys.value.includes(tab)`，不会提取数组首项，也不会逐项检查该数组。因此数组参数不匹配任何允许的字符串，回退为管理员标签列表的第一项 `knowledge`。（`web/src/views/ExtensionsView.vue:51-64`）

2. 管理员独立调用 `replaceTabQuery('knowledge')` 时，默认标签为 `knowledge`，函数先浅拷贝 `{ tab: 'mcp', q: 'needle' }`，再删除副本的 `tab`，最终调用 `router.replace({ query: { q: 'needle' } })`，不是 `router.push`。其他查询字段通过展开拷贝保留，`q` 不变；传给路由方法的对象只显式提供 `query`，没有显式设置 path/name。（`web/src/views/ExtensionsView.vue:51-60、67-75`）
## followup

浏览器初始未登录时，CLI 路由的认证守卫把 `to.fullPath` 写入 `sessionStorage.redirect`，再返回 `/login`。保存的是站内完整目标路径（包含 `?user_code=...`，而非仅 pathname，也不是带域名的绝对 URL）；原命令行授权码随该字符串跨过登录过程，不需要变成登录页的查询参数。（`web/src/router/index.js:36-41、159-184`）

账号密码路径：登录表单完成时触发 `handleLogin`，由它调用 `userStore.login({ loginId, password })`。store 将账号映射为 FormData 的 `username`，连同 `password` POST 到 `/api/auth/token`；成功后用响应的 `access_token`、`user_id`、用户资料和角色更新 store，并把 token 存入 `localStorage.user_token`，由此建立网页登录状态。随后登录页读取 `sessionStorage.redirect`（无值才用 `/`），立即删除该记录；题设中的目标不是 `/`，所以直接 `router.push(redirectPath)` 回到带授权码的 CLI 页面。（`web/src/views/LoginView.vue:155、426-465`；`web/src/stores/user.js:18、23-65`）

手动 OIDC 路径：启用的按钮调用 `handleOIDCLogin`，首先无参调用 `authApi.getOIDCLoginUrl()`。该函数默认 `redirectPath = '/'`，所以给服务端的请求是 `GET /api/auth/oidc/login-url?redirect_path=%2F`；它并没有把本次 CLI 目标路径作为参数传给服务端。获得 `response.login_url` 后，登录页才读取 `sessionStorage.redirect || 当前登录路由.query.redirect || '/'`，把结果存为 `sessionStorage.oidc_redirect`，再以 `window.location.href = response.login_url` 导航。在本题无旧记录的条件下，浏览器保存的是先前守卫写入的 `/auth/cli/authorize?user_code=...`，与发给服务端的 `/` 不同。（`web/src/views/LoginView.vue:220-236、504-522`；`web/src/apis/auth_api.js:36-43`）

OIDC 回调页路由为公开的 `/auth/oidc/callback`。未登录时挂载会执行 `handleCallback`，读取并要求 `route.query.code` 是非空字符串，然后 `POST /api/auth/oidc/exchange-code`，以 JSON `{ code }` 交换登录结果。此请求直接使用 fetch，不经过要求已有登录 token 的通用封装。交换成功后，先以 `router.replace({ path: route.path, query: {} })` 清掉回调 URL 的查询参数，再由回调组件直接更新 userStore：token 取 `access_token`，`userId` 此处实际取 `tokenData.uid`，同时保存其他用户资料和角色，并将 token 写入 `localStorage.user_token`。这条路径不是调用密码登录的 `userStore.login`。（`web/src/router/index.js:30-35`；`web/src/views/OIDCCallbackView.vue:53-86、119-128`；`web/src/apis/auth_api.js:66-80`）

回调读取 `sessionStorage.oidc_redirect`，删除它并调用 `clearAutoStartAttempt`；显示登录成功后约 500ms，因目标不是 `/`，执行 `router.push(redirectPath)`，恢复带原 `user_code` 的 CLI 页面。`clearAutoStartAttempt` 只删除 `oidc_auto_start_attempted`，并不删除 `redirect`。（`web/src/views/OIDCCallbackView.vue:88-109`；`web/src/utils/oidcAutoStart.js:1、31-34`）

因此两条成功路径的实际清理差异是：密码登录消费并删除原 `redirect`；手动 OIDC 仅把原值复制给 `oidc_redirect`，回调消费并删除副本，但保留原 `redirect`。OIDC 还清掉回调 URL 的 code 等查询参数和自动发起标记；不能把这些操作理解为清掉了原命令行链接的授权码。（`web/src/views/LoginView.vue:449-465、513-522`；`web/src/views/OIDCCallbackView.vue:69、88-109`；`web/src/utils/oidcAutoStart.js:31-34`）

OIDC 回调的 `code` 用于兑换网页登录结果；原链接的 `user_code` 用于标识 CLI 授权会话。前端没有把两者转换或混用：前者交给 `/oidc/exchange-code`，后者保存在回跳路径中，回到 CLI 页后用于 `/cli/sessions/{code}` 的读取和批准。网页登录成功只是建立浏览器身份并回到目标页面，不等于完成命令行授权；批准仍由用户点击确认后单独提交。（`web/src/apis/auth_api.js:66-91`；`web/src/views/CLIAuthAuthorizeView.vue:43-45、60、64-98`）
