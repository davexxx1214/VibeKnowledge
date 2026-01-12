## Testing Guidelines

### Test-Driven Development (TDD)
- Write test cases first, ensure they fail
- Implement minimal viable code to make tests pass
- Refactor code while keeping tests passing
- Test-first approach, think about interface design

### Writing Test Cases
- Follow AAA pattern: Arrange, Act, Assert
- Each test should test only one functionality
- Test names clearly describe what is being tested
- Test independence, no dependency on execution order
- Avoid testing implementation details, focus on behavior

### Test Coverage
- **Normal cases**: common use cases and expected flows
- **Edge cases**: null, zero, max/min values
- **Error cases**: invalid input, network errors, timeouts
- **Concurrent scenarios**: race conditions, resource competition
- Target coverage: at least 80%

### Unit Testing
- Test individual functions or methods
- Isolate external dependencies using Mock/Stub
- Fast execution (millisecond level)
- Test various inputs and edge cases

### Integration Testing
- Test interaction between multiple modules
- Use real or near-real environment
- Test database operations, API calls, etc.
- Test end-to-end flows

### Mocks and Stubs
- Mock external dependencies (database, API, file system)
- Use mocking tools provided by test frameworks
- Verify mock object call counts and parameters
- Avoid over-mocking, maintain test realism

### Frontend Testing
- **Component testing**: rendering, interaction, state changes
- **User behavior**: clicks, input, form submission
- **Async operations**: API calls, loading states
- Use Testing Library to test from user perspective

### Backend Testing
- **API testing**: request/response, status codes, data format
- **Business logic**: service layer and data layer
- **Middleware**: authentication, authorization, error handling
- Use test database or in-memory database

### Testing Best Practices
- Keep tests concise and readable
- Update outdated tests promptly
- Fix failed tests instead of skipping them
- Use coverage tools for monitoring
- Automatically run tests in CI/CD

### Testing Tools
- **JavaScript/TypeScript**: Jest, Vitest, Testing Library
- **Python**: pytest, unittest, mock
- **Java**: JUnit, Mockito, TestNG
- **E2E**: Playwright, Cypress

