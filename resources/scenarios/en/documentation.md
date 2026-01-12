## Documentation Guidelines

### API Documentation

#### Endpoint List
- Complete endpoint list with grouping
- HTTP methods and paths
- Brief functional description
- Authentication requirements

#### Request Parameters
- Parameter name and type
- Required or optional
- Default value
- Value range and format
- Example values

#### Response Format
- Success response example (JSON)
- Field descriptions and types
- Possible response status codes
- Pagination info (if applicable)

#### Error Documentation
- Error code list
- Error message descriptions
- Error scenario explanations
- Error response examples

#### Request Examples
- curl command examples
- Examples in different programming languages
- Authentication token usage
- Complete request-response flow

### Code Comments

#### Function/Method Comments
```typescript
/**
 * Calculate the sum of two numbers
 * 
 * @param a - The first addend
 * @param b - The second addend
 * @returns The sum of the two numbers
 * @throws {TypeError} If parameters are not numbers
 * @example
 * ```ts
 * const result = add(1, 2); // 3
 * ```
 */
function add(a: number, b: number): number {
  return a + b;
}
```

#### Class Comments
- Class responsibilities and purposes
- Main property descriptions
- Usage examples
- Notes and caveats

#### Complex Logic Comments
- Explain "why" rather than "what"
- Algorithm approach and edge cases
- Performance considerations
- Known limitations

### README Documentation

#### Project Introduction
- Project name and description
- Main features
- Technology stack
- Project status (in development/stable/maintenance)

#### Quick Start
- Environment requirements
- Installation steps
- Configuration instructions
- How to run
- Example commands

#### Project Structure
- Directory descriptions
- Main file purposes
- Module divisions

#### Development Guide
- Development environment setup
- Code standards
- Commit conventions
- Testing methods
- Debugging tips

#### Deployment Instructions
- Build commands
- Environment variable configuration
- Deployment steps
- Common issues

#### Contributing Guide
- How to contribute code
- PR submission process
- Code review process
- Issue submission standards

### Technical Documentation

#### Architecture Documentation
- System architecture diagram
- Module division and responsibilities
- Technology selection rationale
- Data flow

#### Design Documentation
- Functional requirements
- Technical approach
- Interface design
- Database design
- Risks and limitations

#### Changelog
- Version number and release date
- New features
- Bug fixes
- Breaking changes
- Deprecation notices

### Documentation Best Practices
- Keep documentation in sync with code
- Use clear language, avoid ambiguity
- Provide complete examples
- Use diagrams to aid explanation
- Review and update documentation regularly
- Consider different reader needs (users/developers)

