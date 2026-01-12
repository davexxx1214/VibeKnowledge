## Debugging & Optimization Guidelines

### Error Diagnosis Process
1. **Read error information completely**
   - Error type and error message
   - Complete stack trace
   - Error context

2. **Locate error position**
   - Identify specific file and line number
   - Identify related code paths
   - Review recent code changes

3. **Analyze causes**
   - Variable states and data flow
   - Logic errors or edge cases
   - External dependency issues
   - Environment configuration issues

4. **Provide solutions**
   - Fix code and explain rationale
   - Provide multiple solutions (if applicable)
   - Explain potential side effects
   - Suggest how to avoid similar issues

5. **Verify fix**
   - Test fixed code
   - Check for new issues introduced
   - Update related tests

### Performance Optimization

#### Analysis Methods
- Use performance profiling tools (Profiler)
- Identify performance bottlenecks (CPU/memory/IO)
- Measure metrics before and after optimization
- Set optimization goals

#### Optimization Focus Areas
- **Execution Efficiency**
  - Algorithm complexity optimization
  - Avoid unnecessary computations
  - Cache repeated calculations
  - Parallel processing and async operations

- **Memory Usage**
  - Avoid memory leaks
  - Release resources promptly
  - Use object pools
  - Data structure selection

- **Loading Speed**
  - Code splitting and lazy loading
  - Resource compression and optimization
  - CDN and caching strategies
  - Preload and prefetch

- **User Experience**
  - Reduce time to first paint
  - Optimize interaction response
  - Smooth animations and transitions
  - Loading state feedback

### Code Refactoring

#### Refactoring Principles
- **Maintain functionality**: write tests first for protection
- **Small steps**: make small, safe changes each time
- **Continuous testing**: run tests after each change
- **Commit frequently**: easy to rollback

#### Refactoring Goals
- Improve code readability
- Reduce code duplication (DRY)
- Simplify complex logic
- Improve code structure
- Follow design patterns and best practices

#### Common Refactorings
- Extract function/method
- Extract variable
- Rename
- Consolidate duplicate code
- Decompose large functions/classes
- Introduce design patterns

### Code Review Checklist

- [ ] **Code standards**: follows project style guide
- [ ] **Naming conventions**: meaningful variable/function names
- [ ] **Code structure**: clear logic, single responsibility
- [ ] **Error handling**: complete exception handling
- [ ] **Security**: no obvious security vulnerabilities
- [ ] **Performance**: no obvious performance issues
- [ ] **Testing**: covers main functionality and edge cases
- [ ] **Documentation**: critical logic has comments
- [ ] **Dependencies**: no unnecessary dependencies
- [ ] **Maintainability**: easy to understand and modify

### Debugging Tools
- **Breakpoint debugging**: IDE built-in debugger
- **Logging**: console.log / logger
- **Performance profiling**: Chrome DevTools / Node.js Profiler
- **Memory analysis**: Heap Snapshot
- **Network monitoring**: Network Tab / Charles

