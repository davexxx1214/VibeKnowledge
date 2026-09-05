## discovery

入口是 `/auth/cli/authorize`，路由名 `CLIAuthAuthorize`，加载 `CLIAuthAuthorizeView.vue`；该路由仅标记 `requiresAuth: true`，没有管理员或超级管理员要求。因此题设中正常登录的普通账号符合前端访问条件。全局守卫以 `userStore.isLoggedIn` 判断登录；其定义只是 token 非空。若有 token 而尚无 userId，先请求 `/api/auth/me` 补充用户资料，失败则登出；需要登录但未登录时，把含查询参数的 `to.fullPath` 保存为 `sessionStorage.redirect`，转到 `/login`。这不是对后端授权规则的证明。（`web/src/router/index.js:37–40,157–185,188–204,222–223`；`web/src/stores/user.js:7–20,309–336`）

授权码来自当前 URL 查询参数 `user_code`，按 `String(route.query.user_code || '').trim().toUpperCase()` 处理，既用于页面展示，也传给加载和确认接口。此页面没有生成授权码，也没有展示 URL 如何由终端产生；接口层再用 `encodeURIComponent` 将码编码为路径段。（`web/src/views/CLIAuthAuthorizeView.vue:22,57,64–68,78,89`；`web/src/apis/auth_api.js:83–90`）

组件初始 `loading=true`、`approving=false`、`approved=false`，挂载时调用 `loadSession`。码为空则显示“缺少 CLI 授权码”、停止加载，不发会话请求；非空时发 `GET /api/auth/cli/sessions/{编码后的授权码}`，将返回值存入 `session`，最终关闭加载态。加载过程中显示旋转图标；成功后摘要显示处理后的码、`session.key_name`（空值回退 `Yuxi CLI`）、`session.status` 和 `session.expires_at`（后两者空值回退 `-`），并出现警告和确认按钮。状态与过期时间只是原值展示，没有本地倒计时或按这些字段决定是否允许确认；加载返回 `status=approved` 也没有被转换成组件的 `approved=true`。（`web/src/views/CLIAuthAuthorizeView.vue:9–45,58–83,98`；`web/src/apis/auth_api.js:83–85`；`web/src/apis/base.js:153–154`）

用户点击“确认授权”才调用 `approveSession`：按钮进入 `approving` 加载态，发 `POST /api/auth/cli/sessions/{编码后的授权码}/approve`，JSON 请求体为 `{}`。调用正常完成后直接设置本地 `approved=true`，摘要与按钮被“已授权／可以关闭此页面并回到终端。”成功结果替代；没有检查响应内的状态、读取密钥或再次加载会话。`finally` 清除按钮加载态。（`web/src/views/CLIAuthAuthorizeView.vue:14–21,43–45,86–95`；`web/src/apis/auth_api.js:88–90`；`web/src/apis/base.js:176–185`）

两个会话接口用普通 `apiGet` / `apiPost`，没有使用管理员封装，且默认需要认证。基础请求层在未登录时先抛出“用户未登录”，否则加入 `Content-Type: application/json` 和 `getAuthHeaders()` 返回的 `Authorization: Bearer ${token}`。token 来自当前网页用户 store，初始化读取 `localStorage.user_token`，普通登录成功会把后端 `access_token` 放入 store 和该存储项。身份通过这枚 token 携带，而不是由授权码、凭据名称、角色或请求体中的 userId 指定；确认请求体没有这些身份字段。（`web/src/apis/auth_api.js:83–90`；`web/src/apis/base.js:17–40,153–159,176–185`；`web/src/stores/user.js:7,49–63,142–145`）

加载或确认失败，页面分别记录 `error.message` 或“获取 CLI 授权会话失败”／“确认 CLI 授权失败”，并停止对应加载态。模板优先显示 `errorMessage`，所以错误警告取代加载图标、会话摘要、按钮或成功结果，没有当前页的重试按钮。基础层对非成功 HTTP 响应尝试解析 `detail`／`message`；403 改为“没有权限执行此操作”，500 改为固定服务器错误提示；401 还显示重新登录提示、登出当前用户，并在 1500 毫秒后把浏览器转到 `/login`。网络或解析错误同样向上传播给页面。（`web/src/views/CLIAuthAuthorizeView.vue:9–21,79–83,91–95`；`web/src/apis/base.js:43–119,125–141`；`web/src/stores/user.js:72–89`）

“以你当前的身份创建一个 API Key 并返回给终端”是页面警告文案。此段前端实际做到的是：按 URL 中的码查询会话，以网页当前账号 token 提交批准请求，收到正常完成的响应后显示本地成功结果。批准响应被丢弃；组件没有调用创建 API Key 的接口、保存／展示 API Key、向终端发送密钥、轮询终端领取结果或验证实际创建成功。创建与终端领取是否由服务端或 CLI 完成、密钥最终归属及实际交付结果，不能由此份前端源码确认。（`web/src/views/CLIAuthAuthorizeView.vue:27,70–98`；`web/src/apis/auth_api.js:83–90`）

## control

1. `userStore.isAdmin=false` 时，`normalizeTab('mcp')` 返回 `'skills'`。普通用户标签只有 `skills`，所以允许键列表不包含 `'mcp'`；函数回退到标签列表第一项，即默认键 `'skills'`。（`web/src/views/ExtensionsView.vue:57–64`）

   `userStore.isAdmin=true` 时，`normalizeTab(['skills', 'mcp'])` 返回 `'knowledge'`。管理员允许键是字符串 `knowledge`、`tools`、`mcp`、`skills`；`includes(tab)` 检查的是整个传入值，不会从数组取第一个元素或逐项匹配。传入数组不等于其中任何字符串，因此回退到管理员标签列表第一项 `'knowledge'`。（`web/src/views/ExtensionsView.vue:51–64`）

2. 管理员当前查询为 `{ tab: 'mcp', q: 'needle' }`，独立调用 `replaceTabQuery('knowledge')` 时，先浅复制当前查询，因为 `'knowledge'` 等于默认标签键而删除复制对象的 `tab`，最终调用 `router.replace({ query: { q: 'needle' } })`，不是 `router.push`。传给路由方法的对象只有 `query`，没有显式传 `path`；其他查询字段通过对象展开保留，例如 `q` 仍为 `'needle'`。函数不直接修改原 `route.query`，也没有在内部调用 `normalizeTab`。（`web/src/views/ExtensionsView.vue:51–60,67–75`）
## followup

最初未登录时，访问 `/auth/cli/authorize?user_code=…` 会触发登录守卫：把原目标的 `to.fullPath` 存入 `sessionStorage.redirect`，再返回 `/login`，而不是把目标追加为登录页查询参数。因此保存的是站内完整目标路径（含原查询参数，若有 hash 也属于 fullPath），不是仅保存授权码，也不是包含 origin 的绝对 URL；在题设没有旧回跳记录的情况下，这条记录就是当前 CLI 链接。保存阶段不做 CLI 页的去空格／大写转换，回到授权页后才处理码。（`web/src/router/index.js:37–40,159,176–185`；`web/src/views/CLIAuthAuthorizeView.vue:64–68`）

账号密码路径：`handleLogin` 把表单 `loginId`、`password` 交给 `userStore.login`。store 用 FormData 将它们作为 `username` 和 `password` 发往 `POST /api/auth/token`；成功读取响应后，把 `access_token`、`user_id`、用户名、角色等写入当前 store，同时把 token 写入 `localStorage.user_token`，由 token 非空建立前端登录态。随后登录页读取 `sessionStorage.redirect`，立即删除该记录；本题的 CLI 目标不等于 `/`，因此直接 `router.push(redirectPath)` 恢复原含 `user_code` 的目标。不是成功后重新拼接授权码链接。（`web/src/views/LoginView.vue:442–465`；`web/src/stores/user.js:18,23–33,49–65`）

手动 OIDC 路径：已启用且检查结束后显示的按钮绑定 `handleOIDCLogin`。它先不带参数地调用 `authApi.getOIDCLoginUrl()`；该函数默认 `redirectPath='/'`，所以实际请求是 `GET /api/auth/oidc/login-url?redirect_path=%2F`。拿到 `login_url` 后，才按 `sessionStorage.redirect`、登录页 `query.redirect`、`/` 的优先级选择浏览器回跳目标，写入 `sessionStorage.oidc_redirect`，然后设置 `window.location.href=response.login_url` 离开网页。题设下 `oidc_redirect` 保存完整 CLI 目标，与给服务端的 `redirect_path=/` 明确不同；前端此处并未把 CLI 目标作为该请求参数发给服务端。（`web/src/views/LoginView.vue:219–242,504–522`；`web/src/apis/auth_api.js:36–43`）

OIDC 成功回调入口为 `/auth/oidc/callback`。在尚未登录的题设下，组件挂载调用 `handleCallback`，取得 `route.query.code` 并要求其为非空字符串，随后发 `POST /api/auth/oidc/exchange-code`，JSON 请求体为 `{ code }`。此接口没有使用带 Bearer 的基础请求封装，源码显式设置的是 JSON Content-Type。交换成功后，先 `router.replace({path: route.path, query: {}})` 清掉回调 URL 查询参数，再由回调组件直接将 `tokenData.access_token` 和用户资料赋给 user store，并写入 `localStorage.user_token`，不是调用账号密码的 `userStore.login`。值得按实码区分：密码登录赋 `userId=data.user_id`，回调却赋 `userId=tokenData.uid`，另一个 `uid` 字段也取 `tokenData.uid`；这里不推断服务端字段语义。（`web/src/router/index.js:31–34`；`web/src/views/OIDCCallbackView.vue:54–83,119–128`；`web/src/apis/auth_api.js:66–80`；`web/src/stores/user.js:52–58`）

回调随后读取 `sessionStorage.oidc_redirect`，删除该项并清理 `oidc_auto_start_attempted` 标记，显示登录成功，500 毫秒后对本题非 `/` 的目标执行 `router.push(redirectPath)`，恢复原 CLI 链接。与密码路径的实际差异是：密码路径读取并删除 `redirect`；手动 OIDC 发起时只是把 `redirect` 复制到 `oidc_redirect`，回调读取并删除 `oidc_redirect`，并没有删除原 `redirect`。因此本题成功往返后，密码路径原记录已消费，而 OIDC 路径原 `redirect` 仍留在当前 sessionStorage；清理自动尝试标记不会顺带清理它。此处恢复依赖浏览器保留下来的 sessionStorage；源码不足以证明服务端怎样利用此前的 `redirect_path`。（`web/src/views/LoginView.vue:450–451,517–522`；`web/src/views/OIDCCallbackView.vue:88–109`；`web/src/utils/oidcAutoStart.js:1,31–34`）

两个 code 不是同一用途：OIDC 回调的 `code` 是用来交换网页登录结果的登录 code，使用后从回调 URL 清除；CLI 目标中的 `user_code` 则保留在回跳链接里，用来定位 CLI 授权会话及提交批准。前端没有把 OIDC code 转成 CLI 授权码，也没有用它替换 `user_code`。两种登录成功都只建立网页身份并回到授权页面；页面挂载只查询会话，批准仍绑定用户点击“确认授权”，因此登录成功不等于命令行授权已经完成。（`web/src/views/OIDCCallbackView.vue:56–83,89–107`；`web/src/apis/auth_api.js:66–90`；`web/src/views/CLIAuthAuthorizeView.vue:43–45,64–98`）
