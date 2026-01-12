## API Development Guidelines

### Route Design
- RESTful style: use plural nouns for resources
- Clear route hierarchy
- Proper use of HTTP methods (GET/POST/PUT/PATCH/DELETE)
- Versioning strategy (URL version or Header version)
- Documented and grouped routes

### Request Parameters
- Complete parameter validation (type, range, format)
- Use DTO (Data Transfer Object) definitions
- Query parameters: pagination, sorting, filtering
- Path parameters: resource identifiers
- Request body: structured data with validation rules

### Response Format
- Unified response structure:
  ```json
  {
    "success": true,
    "data": {},
    "message": "Operation successful",
    "timestamp": "2025-11-18T10:30:00.000Z"
  }
  ```
- Pagination responses include total count, page number metadata
- List responses use array wrapper
- Return empty array/object instead of null for no data

### Error Handling
- Unified error response format:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": []
    }
  }
  ```
- Meaningful error codes and messages
- Return detailed errors in development, hide sensitive info in production
- Log all errors

### Status Code Usage
- `200 OK`: Success (GET/PUT/PATCH)
- `201 Created`: Creation success (POST)
- `204 No Content`: Deletion success (DELETE)
- `400 Bad Request`: Parameter error
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: No permission
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### API Documentation
- Description, parameters, and response examples for each endpoint
- Request examples (curl/httpie)
- Error code explanations
- Authentication method documentation
- Auto-generate documentation with Swagger/OpenAPI

### Security
- API authentication (JWT/OAuth2)
- API rate limiting
- CORS configuration
- Input validation and injection prevention
- Sensitive data masking

### Testing
- Unit tests: business logic
- Integration tests: complete API calls
- Test various status codes and error scenarios
- Performance and stress testing

