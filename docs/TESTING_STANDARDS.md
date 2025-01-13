# Testing Standards

## Testing Stack
- **Jest**: Primary testing framework
- **@testing-library/react**: React component testing
- **@testing-library/jest-dom**: DOM matchers
- **jest-environment-jsdom**: Browser environment simulation
- **MSW**: API mocking
- **jest-websocket-mock**: WebSocket testing

## Directory Structure
```
__tests__/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── __mocks__/     # Mock files
```

## Test File Naming
- Unit tests: `*.test.tsx`
- Integration tests: `*.integration.test.tsx`
- E2E tests: `*.e2e.test.tsx`

## Jest Configuration
- Configuration file: `jest.config.ts`
- Setup file: `jest.setup.ts`
- TypeScript configuration: `tsconfig.test.json`

## Testing Guidelines

### Component Tests
1. Test the component's main functionality
2. Test user interactions
3. Test error states
4. Test loading states
5. Test edge cases

Example:
```typescript
describe('Component', () => {
  it('should render successfully', () => {
    render(<Component />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should handle user interactions', () => {
    render(<Component />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### API Tests
1. Mock API responses
2. Test success and error cases
3. Test loading states
4. Verify correct data transformation

Example:
```typescript
jest.mock('next/navigation')

describe('API', () => {
  it('should handle successful response', async () => {
    const mockData = { id: 1, name: 'Test' }
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData)
      })
    )

    render(<Component />)
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument()
    })
  })
})
```

### Socket Tests
1. Mock socket connections
2. Test event emissions
3. Test event handlers
4. Test connection/disconnection

Example:
```typescript
jest.mock('socket.io-client')

describe('Socket', () => {
  it('should emit events correctly', () => {
    const mockSocket = {
      emit: jest.fn(),
      on: jest.fn()
    }

    render(<Component socket={mockSocket} />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSocket.emit).toHaveBeenCalledWith('event', expect.any(Object))
  })
})
```

### State Management Tests
1. Test initial state
2. Test state updates
3. Test side effects
4. Test error handling

Example:
```typescript
describe('Store', () => {
  it('should update state correctly', () => {
    const { result } = renderHook(() => useStore())
    act(() => {
      result.current.update('new value')
    })
    expect(result.current.value).toBe('new value')
  })
})
```

## Best Practices

### Do's
- Write descriptive test names
- Use meaningful assertions
- Mock external dependencies
- Clean up after each test
- Use setup and teardown hooks appropriately
- Test both success and failure paths
- Use data-testid sparingly

### Don'ts
- Don't test implementation details
- Don't use snapshot tests for components
- Don't test third-party code
- Don't write brittle tests
- Don't duplicate test setup
- Don't test multiple things in one test

## Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test path/to/file.test.tsx
```

## Coverage Requirements
- Minimum coverage: 80%
- Critical paths: 100%
- New features: 90%

## Continuous Integration
- Tests run on every PR
- Coverage reports generated
- E2E tests run on staging

## Debugging Tests
- Use `test.only` or `describe.only` to run specific tests
- Use `console.log` for debugging
- Use the debugger statement
- Check Jest output for timing information

## Resources
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Documentation](https://testing-library.com/docs/) 