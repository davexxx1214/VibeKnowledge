# 匿名源码评分

仅依据 X.md、Y.md 的分阶段结论，以及真实前端源码评分。以下源码路径均相对于 `D:/workspace/VibeKnowledge/.vscode-test/feature-routing-dLeIF4/snapshot/`。未以报告长度、阶段在文件中的排列、阅读方法或范围外细节作为评分依据。

## 总分

| 报告 | discovery / 5 | followup / 5 | control / 2 | 总分 / 12 |
| --- | ---: | ---: | ---: | ---: |
| X | 5 | 5 | 2 | 12 |
| Y | 4.5 | 5 | 2 | 11.5 |

## X：逐项理由

| ID | 得分 | 理由与已核对源码 |
| --- | ---: | --- |
| D1 | 1 | 正确定位 CLIAuthAuthorizeView.vue、/auth/cli/authorize 及 requiresAuth；明确普通已登录账号不受管理员条件拦截。引用可追溯：web/src/router/index.js:36–41、157–185、187–223；web/src/stores/user.js:7–20。 |
| D2 | 1 | 正确说明 query.user_code 经 String、trim、toUpperCase 归一化；明确空码报错、结束 loading 并不请求，以及挂载触发加载。对应 web/src/views/CLIAuthAuthorizeView.vue:64–84、98。 |
| D3 | 1 | 正确给出编码后的 GET 会话与 POST approve 路径、JSON 空对象，并追至普通认证封装和当前网页 Bearer token；没有误当管理员接口。对应 web/src/apis/auth_api.js:83–91；web/src/apis/base.js:17–40、153–159、176–191；web/src/stores/user.js:141–146。 |
| D4 | 1 | 正确列出会话展示字段与回退值；成功来自等待 approve 后设置本地 approved，不来自 session.status。明确组件不消费密钥、不向终端交付，API Key 文案不能证明后端行为。对应 web/src/views/CLIAuthAuthorizeView.vue:14–45、58–62、76–90。 |
| D5 | 1 | 区分加载 loading 与确认 approving，说明两种异常写错误及各自回退、finally 结束相应忙碌状态；明确错误优先并替代详情/成功内容。报告关于回退的措辞与通用错误传播说明合起来准确表达异常信息优先。对应 web/src/views/CLIAuthAuthorizeView.vue:9–21、43–45、70–95；web/src/apis/base.js:55–119。 |
| F1 | 1 | 正确说明守卫保存 to.fullPath 至 sessionStorage.redirect，再返回 /login；明确保留原 user_code 查询参数与存在时的 hash，而非只保存 pathname。对应 web/src/router/index.js:180–185。 |
| F2 | 1 | 正确串起 LoginView 调用 store.login、FormData 的 username/password、/api/auth/token POST、登录状态与 user_token 持久化；说明读取并删除 redirect，push 原非根目标。对应 web/src/views/LoginView.vue:442–465；web/src/stores/user.js:23–33、49–65。 |
| F3 | 1 | 正确区分无参 getOIDCLoginUrl 的服务端 redirect_path=/ 与浏览器保存的原 CLI 目标；明确三层目标优先级、写 oidc_redirect 和 window.location.href 跳转。对应 web/src/views/LoginView.vue:513–522；web/src/apis/auth_api.js:36–43。 |
| F4 | 1 | 正确说明回调字符串 code 的 JSON 交换、回调 query 清理、由回调组件建立 store/localStorage 登录态，以及读取删除 oidc_redirect 后导航。准确指出原 redirect 在 OIDC 路径保留，与密码路径不同。对应 web/src/views/OIDCCallbackView.vue:54–109；web/src/apis/auth_api.js:66–80；web/src/views/LoginView.vue:450–451、517–522。额外的 userId=tokenData.uid 与自动标记清理说明也分别得到 OIDCCallbackView.vue:73 和 web/src/utils/oidcAutoStart.js:1、31–34 支持。 |
| F5 | 1 | 正确区分 OIDC code 的网页登录交换用途与 CLI user_code 的会话用途；明确回调 query 清理不修改保存的 CLI 链接，登录仅恢复目标，挂载只加载，仍需点击确认。对应 web/src/apis/auth_api.js:66–91；web/src/views/OIDCCallbackView.vue:56–69、89–109；web/src/views/CLIAuthAuthorizeView.vue:43–45、64–98。 |
| C1 | 1 | 两个返回值 skills、knowledge 均正确；解释直接 includes 匹配整个入参数组、不展开取首项，以及按角色首标签回退。对应 web/src/views/ExtensionsView.vue:51–65。 |
| C2 | 1 | 正确给出 router.replace({ query: { q: 'needle' } })，解释浅复制后仅删除默认 tab，保留其他查询字段，不改用 push。对应 web/src/views/ExtensionsView.vue:51–60、67–75。 |

## Y：逐项理由

| ID | 得分 | 理由与已核对源码 |
| --- | ---: | --- |
| D1 | 1 | 正确定位页面组件和路由，仅要求登录而无管理员条件；关于用户状态补取和 token 登录判定的相关补充也正确。对应 web/src/router/index.js:37–40、157–185、188–223；web/src/stores/user.js:7–20、309–336。 |
| D2 | 1 | 正确说明 user_code 来源、String/trim/toUpperCase 处理、空码报错结束 loading 且不请求，并明确挂载加载。没有把归一化夸大为严格格式验证。对应 web/src/views/CLIAuthAuthorizeView.vue:64–84、98。 |
| D3 | 1 | 正确说明两个编码端点、GET/POST 与 JSON {}；追至默认认证的 apiGet/apiPost 和当前网页 Bearer token，而非管理员专用封装。对应 web/src/apis/auth_api.js:83–91；web/src/apis/base.js:17–40、153–159、176–186；web/src/stores/user.js:142–145。 |
| D4 | 1 | 正确列出展示字段与回退值，说明只在 approve 正常完成后设置 approved；明确响应中的 Key 未被读取、保存、展示或传递，不将文案当作已核实后端实现。对应 web/src/views/CLIAuthAuthorizeView.vue:14–45、58–62、76–95。 |
| D5 | 0.5 | 两种异常的 error.message 优先和回退文案、错误模板优先、初次 loading 与按钮 approving 的区别均正确，也明确了确认请求 finally 清除按钮 loading。但只写了“无论成功失败，finally 都清除按钮 loading”，未说明初次加载请求也在 finally 将 loading=false；这一项要求覆盖两条请求的忙碌状态收尾，不能仅凭所附行号替代缺失结论。对应 web/src/views/CLIAuthAuthorizeView.vue:9–21、43–45、70–95，特别是 81–82 与 93–94 两个独立 finally。属于重要遗漏，不是错误断言。 |
| F1 | 1 | 正确说明 sessionStorage.redirect 保存 to.fullPath，包含 user_code 和存在时的 hash，然后去 /login，且非通过登录页 query 传递完整目标。对应 web/src/router/index.js:37–40、181–184。 |
| F2 | 1 | 正确说明 LoginView → userStore.login、FormData(username=loginId,password)、POST /api/auth/token、store 与 localStorage 建立登录；读取并删除 redirect 后 push 原目标。对应 web/src/views/LoginView.vue:442–465；web/src/stores/user.js:18、23–33、49–65。 |
| F3 | 1 | 明确无参数 getOIDCLoginUrl 导致服务端参数为默认 /，与本地保存的 CLI 链接不同；正确给出目标优先级、oidc_redirect 写入和外部导航。对应 web/src/views/LoginView.vue:513–522；web/src/apis/auth_api.js:36–43。 |
| F4 | 1 | 完整说明 code 类型检查、JSON code 交换、回调 URL query 清理、回调组件直接建立登录状态及持久化，再消费 oidc_redirect 返回。明确密码删除 redirect，OIDC 保留 redirect；额外的 uid 差异与清理自动标记也准确。对应 web/src/views/OIDCCallbackView.vue:54–109、119–128；web/src/apis/auth_api.js:66–80；web/src/views/LoginView.vue:450–451、517–522；web/src/utils/oidcAutoStart.js:1、31–34。 |
| F5 | 1 | 正确区分两个 code 的用途，说明 user_code 随保存目标跨越登录，回调清 query 不清该记录；登录只恢复访问，不自动 approve，挂载仍仅加载，须显式点击确认。对应 web/src/apis/auth_api.js:66–91；web/src/views/OIDCCallbackView.vue:69、89–109；web/src/views/CLIAuthAuthorizeView.vue:43–45、60、64–98。 |
| C1 | 1 | skills 与 knowledge 两个结果均准确，整个数组不能匹配允许键中的字符串，非法输入回退当前角色默认首项。对应 web/src/views/ExtensionsView.vue:51–65。 |
| C2 | 1 | 准确给出 router.replace({ query: { q: 'needle' } })，解释复制 query、删除默认 tab、保留 q 和其他字段。对应 web/src/views/ExtensionsView.vue:51–60、67–75。 |

## 重大错误

X：无。Y：无。

未发现符合 M1–M5 或可另行证实的新增重大错误。Y 的 D5 扣分仅属于覆盖不完整，不记入重大错误，也不另扣总分。

## 累计检查

全部 12 个 rubric ID 均已评分，分值仅使用 0、0.5、1。X：5 + 5 + 2 = 12；Y：4.5 + 5 + 2 = 11.5。
