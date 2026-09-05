## discovery

入口是 `/auth/cli/authorize`（路由名 `CLIAuthAuthorize`），懒加载 `CLIAuthAuthorizeView.vue`，仅声明 `requiresAuth: true`，没有管理员或超级管理员条件。因此题述已正常登录的普通账号满足这个页面的前端访问条件。全局守卫按匹配路由的 meta 判断权限；有 token 而没有 userId 时先调用 `getCurrentUser()`，失败则登出；未登录访问该页会把包含查询参数的 `to.fullPath` 保存到 `sessionStorage.redirect` 并转到 `/login`。其他条件不触发时正常放行。（`web/src/router/index.js:37–40、157–184、188–204、217–223`）前端 `isLoggedIn` 的定义是 token 非空，token 初始来自 `localStorage.user_token`；补取用户信息使用带身份头的 `GET /api/auth/me`，不是前端自行验证 token 的真实性。（`web/src/stores/user.js:7–20、309–336`）

授权码由 URL 查询参数 `user_code` 提供，而非页面生成：`String(route.query.user_code || '').trim().toUpperCase()` 转为字符串、去首尾空白、转大写，同一个计算值用于显示和请求。这里没有进一步的格式校验；空码时设置“缺少 CLI 授权码”、结束 loading，不发会话请求。两个 API 方法在把码插入路径前都会 `encodeURIComponent`。（`web/src/views/CLIAuthAuthorizeView.vue:22、64–78`；`web/src/apis/auth_api.js:83–90`）

组件挂载时执行 `loadSession()`，发出 `GET /api/auth/cli/sessions/{编码后的授权码}`，成功结果直接赋给 `session`；没有响应包装字段解包。初始 `loading=true`，加载时显示 spinner；成功后显示授权码及 `session.key_name`、`session.status`、`session.expires_at`，缺失值分别回退为 `Yuxi CLI`、`-`、`-`。状态和过期时间只是显示，未据此做倒计时、自动确认、禁用按钮或跳转；组件只在挂载时调用加载函数，没有轮询或查询参数变化监听。（`web/src/views/CLIAuthAuthorizeView.vue:9–45、58–84、98`；`web/src/apis/auth_api.js:83–85`）

点击“确认授权”执行 `approveSession()`：先设 `approving=true` 驱动按钮 loading，随后 `POST /api/auth/cli/sessions/{编码后的授权码}/approve`，JSON 请求体为 `{}`；没有提交凭据名称、用户名、角色或新 API Key。请求成功返回后不读取响应内容，只把 `approved=true`；页面改成“已授权／可以关闭此页面并回到终端。”，不自动关闭页面或导航。无论成功失败，finally 都清除按钮 loading。（`web/src/views/CLIAuthAuthorizeView.vue:14–19、43–45、86–95`；`web/src/apis/auth_api.js:88–90`；`web/src/apis/base.js:176–186`）

上述 GET 和 POST 使用普通 `apiGet/apiPost`，默认 `requiresAuth=true`，不是管理员专用请求封装。公共请求层检查 `userStore.isLoggedIn`，然后添加 `Authorization: Bearer ${token.value}`，并为这里的非 FormData 请求设置 `Content-Type: application/json`；所以显式携带的是当前网页登录 token，授权码则用于定位 CLI 会话，不是身份请求头。普通登录成功时 token 来自 `/api/auth/token` 响应的 `access_token`，存入 store 和 `localStorage.user_token`。（`web/src/apis/auth_api.js:83–90`；`web/src/apis/base.js:17–40、153–159、176–186`；`web/src/stores/user.js:30–33、49–63、142–145`）

加载失败或确认失败分别把 `error.message`（没有时用“获取 CLI 授权会话失败”或“确认 CLI 授权失败”）赋给 `errorMessage`。模板最优先显示该错误 alert，所以错误出现后摘要、确认按钮及成功块均被隐藏，页面没有重试或清除错误的操作。公共层非 2xx 错误会提取 JSON `detail`／`message`（结构化 detail 取 message 或 error），否则用 HTTP 状态描述；403 改成“没有权限执行此操作”，500 改成服务器内部错误提示；401 还会弹出认证失败／登录过期消息、对已登录 store 登出，并在 1.5 秒后设置 `window.location.href='/login'`。网络等异常也重新抛给页面。（`web/src/views/CLIAuthAuthorizeView.vue:9–21、79–83、91–95`；`web/src/apis/base.js:43–119、137–141`）

“以你当前的身份创建一个 API Key 并返回给终端”是页面警告文案。这个浏览器链路实际完成到：查询指定 CLI 会话、携带当前网页登录身份提交 approve、以请求正常完成为依据显示成功。页面没有调用独立创建 API Key 的接口，没有读取、保存、显示或传递 approve 响应中的 Key，也没有和终端建立通信；不能据此断言后端确已创建 Key、采用何种权限／有效期，或终端如何取得它。这些都是该前端源码不能证明的后端／终端行为。（`web/src/views/CLIAuthAuthorizeView.vue:27、70–98`；`web/src/apis/auth_api.js:83–90`）

## control

1. `userStore.isAdmin=false` 时，`normalizeTab('mcp')` 返回 `'skills'`：普通用户的标签数组只有 `skills`，所以 `allowedTabKeys` 不包含 `mcp`，函数回退到首个标签对应的 `defaultTabKey='skills'`。`userStore.isAdmin=true` 时，`normalizeTab(['skills', 'mcp'])` 返回 `'knowledge'`：管理员允许的键是四个字符串 `knowledge`、`tools`、`mcp`、`skills`，`includes(tab)` 检查的是整个传入数组，并不遍历或选取其中一个元素，因此不匹配任何字符串；管理员首个标签是 `knowledge`，故返回该默认值。（`web/src/views/ExtensionsView.vue:51–65`）

2. 管理员的默认标签为 `'knowledge'`。在 `route.query={ tab: 'mcp', q: 'needle' }` 时独立调用 `replaceTabQuery('knowledge')`，先展开复制当前 query，再因参数等于默认标签而删除副本的 `tab`，最后调用的是 `router.replace({ query: { q: 'needle' } })`，不是 `router.push`。其他查询字段通过对象展开保留；函数不直接删除原 `route.query` 对象的字段，也没有在传给路由方法的对象中显式指定 path。（`web/src/views/ExtensionsView.vue:51–60、67–74`）
## followup

两条路径共同的起点：未登录打开 `/auth/cli/authorize?user_code=…` 时，守卫把 `to.fullPath` 存入 `sessionStorage.redirect`，然后返回 `/login`。保留的是目标站内路径、查询参数及存在时的 hash，不只是 `/auth/cli/authorize`，因此原 `user_code` 随目标保留；这里不是把完整目标传成 `/login` 的 query。（`web/src/router/index.js:37–40、181–184`）

账号密码路径：表单成功提交进入 `handleLogin()`，调用 `userStore.login({ loginId, password })`。store 把 loginId 作为 FormData 的 `username`，连同 `password` POST 到 `/api/auth/token`；成功读取响应，写入 token、`userId=data.user_id`、用户名、uid、角色等 store 状态，并把 `access_token` 保存为 `localStorage.user_token`，从而使以 token 非空判断的 `isLoggedIn` 成立。返回登录页处理函数后，读取 `sessionStorage.redirect`，立即删除该项；题设的目标不是 `/`，所以直接 `router.push(redirectPath)` 恢复带授权码的链接。（`web/src/views/LoginView.vue:426–465`；`web/src/stores/user.js:18、23–33、49–65`）

手动 OIDC 路径：按钮处理函数调用的是**无参数**的 `authApi.getOIDCLoginUrl()`。该 API 的默认 `redirectPath='/'`，因此请求服务端的是 `GET /api/auth/oidc/login-url?redirect_path=%2F`，不是 CLI 授权目标。收到 `login_url` 后，浏览器另行取 `sessionStorage.redirect || 当前登录路由.query.redirect || '/'`，存为 `sessionStorage.oidc_redirect`，再用 `window.location.href=login_url` 离开页面。题设中第一项已经存在，所以 `oidc_redirect` 保存原带授权码的目标；服务端收到的回跳参数 `/` 与浏览器保存的目标**不相同**。源码只证明这两个值及浏览器动作，服务端如何使用 `/` 不在此结论范围内。（`web/src/views/LoginView.vue:504–522`；`web/src/apis/auth_api.js:36–43`）

成功回调进入公开路由 `/auth/oidc/callback`。回调组件挂载时，在题设仍未登录的条件下执行 `handleCallback()`，读取 `route.query.code`，要求为非空字符串，然后通过 `POST /api/auth/oidc/exchange-code` 发送 JSON `{ code }` 交换登录结果。这个请求直接使用 fetch，代码没有添加当前网页登录 Bearer 头。交换成功后先 `router.replace({ path: route.path, query: {} })` 清除回调 URL 的查询参数，再由回调组件自身直接写入 `userStore.token=tokenData.access_token`、用户名、角色等，并保存 `localStorage.user_token`；这条路径不调用账号密码的 `userStore.login()`。特别地，此处实际给 `userStore.userId` 赋的是 `tokenData.uid`，账号密码路径给的是 `data.user_id`，不能把两者写成同一实现。（`web/src/router/index.js:31–34`；`web/src/views/OIDCCallbackView.vue:53–83、119–127`；`web/src/apis/auth_api.js:66–80`；`web/src/stores/user.js:52–58`）

OIDC 回调成功后读取 `sessionStorage.oidc_redirect`，删除该项，调用 `clearAutoStartAttempt()`，结束 loading；延迟 500 毫秒后，对题设非 `/` 目标执行 `router.push(redirectPath)`，恢复原授权链接。回跳记录的实际差异是：账号密码成功消费并删除 `redirect`；手动 OIDC 发起时复制 `redirect` 到 `oidc_redirect` 而没有删除原项，成功回调只消费并删除 `oidc_redirect`，因此题设的 `redirect` 仍保留。`clearAutoStartAttempt()` 只删除 `oidc_auto_start_attempted`，并不删除 `redirect`；清除回调 URL query 也不是清除这条 sessionStorage 记录。（`web/src/views/LoginView.vue:450–451、517–522`；`web/src/views/OIDCCallbackView.vue:69、88–109`；`web/src/utils/oidcAutoStart.js:1、31–33`）

两种 code 用途不同：OIDC 回调的 `code` 用来交换网页登录状态；原目标 URL 的 `user_code` 用来标识要查询、确认的 CLI 授权会话，依靠保存的目标链接跨过登录，前端没有把二者互换或直接建立值映射。登录成功只是恢复访问该授权页面的条件，并不等于完成命令行授权：回到页面后挂载仅加载会话，`approved` 初始仍为 false，仍需用户点击确认，等 approve 请求成功才设为 true。（`web/src/apis/auth_api.js:66–90`；`web/src/views/CLIAuthAuthorizeView.vue:43、60、64–90、98`）
