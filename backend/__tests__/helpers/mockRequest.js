/**
 * Mock Request Helper
 * Creates a mock Express request object for testing
 */

const createMockRequest = (overrides = {}) => {
  const req = {
    params: {},
    body: {},
    query: {},
    headers: {},
    user: null,
    app: {
      get: jest.fn(),
    },
    ...overrides,
  };
  return req;
};

module.exports = { createMockRequest };
