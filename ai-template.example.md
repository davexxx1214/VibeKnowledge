## 项目自定义规范示例

> 这是一个示例模板文件，展示如何为 AI 工具提供项目特定的指导。
> 
> **使用方法**：
> 1. 将此文件复制到 `.vscode/.knowledge/ai-template.md`
> 2. 根据项目需求修改内容
> 3. 运行 `Knowledge: Generate All AI Config Files`
> 
> **注意**：放在 `.vscode/.knowledge/` 和数据库一起，不会被 RAG 系统索引为文档

---

### 命名约定

- **类名**：使用 PascalCase，例如 `UserService`, `ArticleController`
- **方法名**：使用 camelCase，例如 `getUserById`, `createArticle`
- **常量**：使用 UPPER_SNAKE_CASE，例如 `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`
- **文件名**：使用 kebab-case，例如 `user-service.ts`, `article-controller.ts`

### 代码风格

- ✅ **使用 async/await**，避免使用 Promise.then()
- ✅ **优先使用箭头函数**，除非需要 `this` 绑定
- ✅ **使用 TypeScript 严格模式**，避免使用 `any` 类型
- ✅ **每个文件最多 300 行**，超过则拆分
- ❌ **不要使用 var**，统一使用 `const` 或 `let`

### API 设计规范

- **RESTful 风格**：遵循 REST API 设计原则
  - GET：查询资源
  - POST：创建资源
  - PUT/PATCH：更新资源
  - DELETE：删除资源

- **路由命名**：使用复数形式
  - ✅ `/users/:id`
  - ❌ `/user/:id`

- **响应格式**：统一返回 JSON 格式
  ```json
  {
    "success": true,
    "data": {},
    "message": "操作成功"
  }
  ```

### 错误处理

- 使用自定义异常类
- 在 Controller 层捕获并返回友好的错误信息
- 记录详细的错误日志（包含堆栈信息）
- 敏感信息不要暴露给客户端

### 测试规范

- **单元测试**：覆盖率应 ≥ 80%
- **测试文件命名**：`*.spec.ts`
- **测试描述**：使用清晰的中文描述
  ```typescript
  describe('UserService', () => {
    it('应该成功创建用户', async () => {
      // test code
    });
  });
  ```

### 数据库操作

- 使用 Repository 模式
- 避免在 Service 中直接使用原生 SQL
- 复杂查询使用 QueryBuilder
- 必须处理事务（创建、更新、删除操作）

### 安全注意事项

- ⚠️ **用户输入验证**：所有外部输入必须验证
- ⚠️ **SQL 注入防护**：使用参数化查询
- ⚠️ **XSS 防护**：对输出内容进行转义
- ⚠️ **敏感数据**：密码、Token 等不要记录到日志

### 性能优化

- 查询结果较大时使用分页
- 频繁查询的数据考虑缓存（Redis）
- 避免 N+1 查询问题
- 大数据量操作使用批处理

### Git 提交规范

使用 Conventional Commits 格式：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具链更新

示例：`feat: 添加用户登录功能`

---

💡 **提示**：这些规范会被自动添加到生成的 AI 配置文件中，帮助 Cursor 和 GitHub Copilot 更好地理解项目的具体要求。

