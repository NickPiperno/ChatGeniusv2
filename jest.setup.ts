import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SOCKET_URL = 'ws://localhost:3000'
process.env.AWS_REGION = 'mock-region'
process.env.AWS_ACCESS_KEY_ID = 'mock-key'
process.env.AWS_SECRET_ACCESS_KEY = 'mock-secret'

// Mock DynamoDB
jest.mock('./lib/services/dynamodb', () => {
  return {
    DynamoDBService: jest.fn().mockImplementation(() => ({
      createMessage: jest.fn().mockResolvedValue({}),
      getMessage: jest.fn().mockResolvedValue({}),
      getRepliesForMessage: jest.fn().mockResolvedValue([]),
      updateMessage: jest.fn().mockResolvedValue({}),
      deleteMessage: jest.fn().mockResolvedValue({}),
    }))
  }
})

// Mock logger
jest.mock('./lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}))

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback: any) {
    this.observe = jest.fn()
    this.unobserve = jest.fn()
    this.disconnect = jest.fn()
  }
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
}

window.IntersectionObserver = MockIntersectionObserver as any

// Mock ResizeObserver
class MockResizeObserver {
  constructor(callback: any) {
    this.observe = jest.fn()
    this.unobserve = jest.fn()
    this.disconnect = jest.fn()
  }
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
}

window.ResizeObserver = MockResizeObserver as any

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
}) 