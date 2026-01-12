## Frontend Development Guidelines

### UI Component Development
- All components must support responsive design for different devices
- Use the project's unified design system and component library
- Component props must have complete TypeScript type definitions
- Break complex components into smaller sub-components with single responsibility
- Ensure component reusability and testability

### Styling Guidelines
- Follow project CSS conventions (CSS Modules/Tailwind/Styled-components)
- Support dark mode (if required by project)
- Ensure accessibility (a11y) with proper semantic HTML
- Maintain consistency with overall design system
- Ensure proper display across different browsers and devices

### State Management
- Use the project's agreed state management solution (Redux/Zustand/Context)
- Avoid prop drilling, use Context or state library appropriately
- Handle loading and error states for async operations
- Design clear state structure, avoid redundancy
- Use local state and global state appropriately

### Performance Optimization
- Use React.memo, useMemo, useCallback appropriately
- Avoid unnecessary re-renders
- Use virtual scrolling for large lists (react-window/react-virtualized)
- Implement lazy loading and image optimization
- Code splitting and lazy loading

### Testing Requirements
- Each component should have corresponding test file
- Test user interactions and edge cases
- Use Testing Library to test user behavior rather than implementation details
- Keep tests concise and maintainable

### Development Notes
- Avoid inline functions and objects (unless performance impact is negligible)
- Handle form validation and submission properly
- Use useEffect correctly, avoid dependency issues
- Watch for memory leaks, clean up timers and subscriptions

