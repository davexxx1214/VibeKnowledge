## discovery

入口是顶层懒加载路由 `/auth/cli/authorize`（路由名 `CLIAuthAuthorize`），对应 `CLIAuthAuthorizeView.vue`，只设置 `requiresAuth: true`，未要求管理员或超级管理员。因此题设中已正常登录的普通账号可以通过前端路由守卫；这不等于证明服务端也允许该账号批准任意会话。守卫在有 token 而无用户 ID 时先获取当前用户，失败则登出；未登录时把包含查询参数的 `to.fullPath` 保存到 `sessionStorage.redirect`，再跳转 `/login`。前端 `isLoggedIn` 的定义是 token 非空。（`web/src/router/index.js:36-41,156-188,203-215`；`web/src/stores/user.js:7-20`）

授权码不是页面生成的，而是来自当前 URL 的 `route.query.user_code`，按 `String(route.query.user_code || '').trim().toUpperCase()` 处理。空码显示“缺少 CLI 授权码”、结束加载且不请求。此页不能证明终端如何生成授权码或构造浏览器 URL。（`web/src/views/CLIAuthAuthorizeView.vue:57-78`）

组件挂载时仅调用一次 `loadSession`，以处理后的码发起 `GET /api/auth/cli/sessions/{encodedCode}`，路径段再次经过 `encodeURIComponent`。加载期间显示旋转指示器；成功把响应赋给 `session`，展示规范化后的授权码、`session.key_name`（缺省 `Yuxi CLI`）、`session.status` 和 `session.expires_at`（后两者缺省 `-`），并显示“确认授权”按钮。（`web/src/views/CLIAuthAuthorizeView.vue:9-45,70-84,98`；`web/src/apis/auth_api.js:83-86`）

只有点击按钮才调用 `approveSession`，发出 `POST /api/auth/cli/sessions/{encodedCode}/approve`，JSON 请求体为 `{}`；批准期间按钮绑定 `approving` 显示加载。两次请求都使用通用 API 封装，默认要求登录，未登录会先抛出“用户未登录”；请求头含 `Content-Type: application/json` 和当前 user store 的 `Authorization: Bearer ${token}`，并没有把凭据名称、用户 ID 或角色另外放入批准请求体。token 初始取自本地 `user_token`；密码登录成功后保存的是响应 `access_token`。（`web/src/views/CLIAuthAuthorizeView.vue:43,86-95`；`web/src/apis/auth_api.js:88-90`；`web/src/apis/base.js:17-40,153-155,176-186`；`web/src/stores/user.js:7,49-63,141-146`）

批准调用成功返回后，页面不消费响应内容，仅将本地 `approved` 置为 `true`，会话摘要和确认按钮切换为“已授权／可以关闭此页面并回到终端”。读取或批准抛错时分别优先显示 `error.message`，无消息则使用“获取 CLI 授权会话失败”或“确认 CLI 授权失败”，并结束对应加载状态；错误警告的展示优先级高于加载、成功页及摘要，因此失败会遮住原内容。通用层把非成功 HTTP 状态变成异常，403 文案改为“没有权限执行此操作”，500 改为服务器内部错误；401 还显示认证错误提示、清除已登录状态，并安排 1.5 秒后跳转 `/login`。（`web/src/views/CLIAuthAuthorizeView.vue:9-21,79-95`；`web/src/apis/base.js:42-119`）

“以你当前的身份创建一个 API Key 并返回给终端”是警告框中的承诺文案；这段前端实际仅实现读取会话、携带当前网页登录 token 提交批准、请求成功后展示成功提示，没有取得、保存、显示或向终端发送 API Key。Key 是否创建、由谁创建、如何交付，以及会话过期或重复批准如何处理，均不能由这些前端调用证明。（`web/src/views/CLIAuthAuthorizeView.vue:14-27,70-98`；`web/src/apis/auth_api.js:83-90`）

此外，`approved` 初始为 `false`，不是从服务端 `session.status` 推导；会话摘要中的状态和过期时间只做显示，不参与按钮可用性判断。组件没有轮询、query 监听、重试或拒绝按钮，非本人请求的处理建议是关闭页面。（`web/src/views/CLIAuthAuthorizeView.vue:21-45,53-98`）

## control

1. `userStore.isAdmin === false` 时，`normalizeTab('mcp')` 返回 `'skills'`。普通用户标签列表只有 `skills`，所以允许键不包含 `'mcp'`；函数回退到列表第一项对应的默认标签 `'skills'`。（`web/src/views/ExtensionsView.vue:57-64`）

   `userStore.isAdmin === true` 时，`normalizeTab(['skills', 'mcp'])` 返回 `'knowledge'`。管理员允许键是四个字符串 `'knowledge'`、`'tools'`、`'mcp'`、`'skills'`；函数直接以整个传入数组调用 `includes(tab)`，既不取数组第一项也不逐项判断，所以未命中字符串列表，回退到管理员列表的第一项 `'knowledge'`。（`web/src/views/ExtensionsView.vue:51-64`）

2. 管理员的默认标签为 `'knowledge'`。当 `route.query` 是 `{ tab: 'mcp', q: 'needle' }` 时，独立调用 `replaceTabQuery('knowledge')` 会先浅拷贝原查询对象，因目标等于默认标签而删除副本的 `tab`，最终调用 `router.replace({ query: { q: 'needle' } })`，不是 `router.push`，也没有传入 `path`。其他查询字段通过展开复制保留；函数不直接修改原 `route.query`。（`web/src/views/ExtensionsView.vue:51-60,67-74`）
## followup

在题设初始状态下，未登录用户访问 `/auth/cli/authorize?user_code=…`，全局守卫将 `to.fullPath` 存到 `sessionStorage.redirect`，随后返回 `/login`。保存的是完整站内目标（含原查询参数及存在时的 hash），不是单独的授权码，也不是把授权码改成登录页参数；浏览器来源域名不属于这里保存的 `fullPath`。（`web/src/router/index.js:36-40,156-184`）

账号密码路径：`LoginView.handleLogin` 调用 `userStore.login({ loginId, password })`；store 以 FormData 的 `username`、`password` 字段 `POST /api/auth/token`，成功后把响应 `access_token` 写入 token、`user_id` 写入 userId，并更新用户名、角色等用户字段，将 token 保存到 `localStorage.user_token`。这一步建立网页登录态，`isLoggedIn` 由 token 是否非空计算。之后登录页读取 `sessionStorage.redirect`，立即删除该记录；原 CLI 目标不是 `/`，所以直接 `router.push(redirectPath)`，恢复带原 `user_code` 的页面。（`web/src/views/LoginView.vue:442-465`；`web/src/stores/user.js:18,23-65`）

手动 OIDC 路径：`handleOIDCLogin` 无参调用 `authApi.getOIDCLoginUrl()`；该函数的 `redirectPath` 默认是 `/`，因此发出的请求是 `GET /api/auth/oidc/login-url?redirect_path=%2F`。取得 `response.login_url` 后，登录页再按 `sessionStorage.redirect`、登录页 `query.redirect`、`/` 的优先级选择目标，写入 `sessionStorage.oidc_redirect`，然后以 `window.location.href` 跳往返回的登录 URL。题设中前一个守卫已保存 CLI 链接，所以浏览器的 `oidc_redirect` 是原完整 CLI 目标，与请求给服务端的 `redirect_path=/` 不相同；前端没有在这次手动调用中把 CLI 目标作为 `getOIDCLoginUrl` 参数。（`web/src/views/LoginView.vue:504-522`；`web/src/apis/auth_api.js:36-43`）

成功回到公开的 `/auth/oidc/callback` 后，回调组件在未登录分支处理 `route.query.code`，要求它是非空字符串，然后 `POST /api/auth/oidc/exchange-code`，JSON 为 `{ code }`。拿到结果后先以 `router.replace({ path: route.path, query: {} })` 清空回调查询参数，再由回调组件直接写入 user store：token 来自 `access_token`，此处 userId 实际取 `tokenData.uid`（不同于密码登录取 `user_id`），并更新其余用户字段、将 token 存入 `localStorage.user_token`。随后读取并删除 `oidc_redirect`，清除自动尝试标记，结束加载，显示登录成功，安排 500 毫秒后 `router.push(redirectPath)`；原 CLI 目标非 `/`，会恢复原授权链接。（`web/src/router/index.js:30-34`；`web/src/views/OIDCCallbackView.vue:53-109,119-128`；`web/src/apis/auth_api.js:66-80`）

清理差异：密码登录消费并删除的是 `redirect`；手动 OIDC 发起只把它复制到 `oidc_redirect`，没有删除原记录；成功回调删除 `oidc_redirect`，但未删除 `redirect`。回调调用的 `clearAutoStartAttempt()` 仅删除 `oidc_auto_start_attempted`，并不顺带清理 `redirect`。因此在本题手动 OIDC 成功往返后，最初的 `redirect` 仍保留；密码登录成功后则已移除。（`web/src/views/LoginView.vue:449-451,517-519`；`web/src/views/OIDCCallbackView.vue:88-91`；`web/src/utils/oidcAutoStart.js:1,31-34`）

OIDC 回调 `code` 是用于交换网页登录结果的登录 code；原 URL 的 `user_code` 是 CLI 会话定位及批准所用授权码。两者字段、消费者和请求端点都不同，前端没有把一个转换为另一个：登录 code 随回调查询参数清理，CLI 授权码仍随浏览器保存的原目标恢复。登录完成只建立网页登录身份并回到授权页，不等于批准命令行登录；批准仍须用户在该页主动点击确认，登录成功代码未调用 `approveCLIAuthSession`。（`web/src/apis/auth_api.js:66-90`；`web/src/views/OIDCCallbackView.vue:56-69,89-108`；`web/src/views/LoginView.vue:442-465`；`web/src/views/CLIAuthAuthorizeView.vue:43,60,64-68,86-98`）
