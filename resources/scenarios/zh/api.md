## API 开发场景规范

### 路由设计
- RESTful 风格：资源命名使用复数名词
- 清晰的路由层次结构
- 合理使用 HTTP 方法（GET/POST/PUT/PATCH/DELETE）
- 版本控制策略（URL 版本或 Header 版本）
- 路由文档化和分组管理

### 请求参数
- 完整的参数验证（类型、范围、格式）
- 使用 DTO（Data Transfer Object）定义
- 查询参数：分页、排序、过滤
- 路径参数：资源标识符
- 请求体：结构化数据和验证规则

### 响应格式
- 统一的响应结构：
  ```json
  {
    "success": true,
    "data": {},
    "message": "操作成功",
    "timestamp": "2025-11-18T10:30:00.000Z"
  }
  ```
- 分页响应包含总数、页码等元信息
- 列表响应使用数组包装
- 空数据返回空数组/对象而非 null

### 错误处理
- 统一的错误响应格式：
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "参数验证失败",
      "details": []
    }
  }
  ```
- 有意义的错误码和错误信息
- 开发环境返回详细错误，生产环境隐藏敏感信息
- 记录所有错误日志

### 状态码使用
- `200 OK`：成功（GET/PUT/PATCH）
- `201 Created`：创建成功（POST）
- `204 No Content`：删除成功（DELETE）
- `400 Bad Request`：参数错误
- `401 Unauthorized`：未认证
- `403 Forbidden`：无权限
- `404 Not Found`：资源不存在
- `500 Internal Server Error`：服务器错误

### API 文档
- 每个端点的描述、参数、响应示例
- 请求示例（curl/httpie）
- 错误码说明
- 认证方式说明
- 使用 Swagger/OpenAPI 自动生成文档

### 安全性
- API 认证（JWT/OAuth2）
- API 限流（Rate Limiting）
- CORS 配置
- 输入验证和注入防护
- 敏感数据脱敏

### 测试
- 单元测试：业务逻辑
- 集成测试：完整的 API 调用
- 测试各种状态码和错误场景
- 性能测试和压力测试

