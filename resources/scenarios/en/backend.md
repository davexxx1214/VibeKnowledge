## Backend Development Guidelines

### API Implementation
- RESTful APIs follow standard HTTP method semantics
- Unified response format and error code definitions
- Proper use of status codes (2xx/4xx/5xx)
- API versioning and backward compatibility
- Complete API documentation (Swagger/OpenAPI)

### Database Design
- Proper table structure design following normalization
- Set up indexes correctly to optimize query performance
- Foreign key constraints and data integrity
- Version-controlled database migration scripts
- Consider data scalability and partitioning strategies

### Middleware Development
- Unified error handling middleware
- Request logging and performance monitoring
- Authentication and authorization middleware
- Request validation and parameter filtering
- Rate limiting and protection measures

### Service Layer Design
- Separate business logic from controllers
- Single Responsibility Principle for services
- Proper use of dependency injection
- Transaction management and data consistency
- Caching strategies (Redis/Memcached)

### Third-party Service Integration
- SDK configuration and initialization
- API call encapsulation and error handling
- Retry mechanisms and circuit breakers
- Timeout control and resource management
- Complete unit tests and integration tests

### Security
- Input validation and parameter filtering
- SQL injection prevention
- XSS/CSRF protection
- Encrypted storage for sensitive data
- API access control and permission management

### Performance Optimization
- Database query optimization, avoid N+1 problem
- Proper use of caching
- Asynchronous processing and message queues
- Connection pooling and resource reuse
- Monitoring and performance analysis

