// Mock for node-fetch to avoid ESM issues in tests
module.exports = jest.fn((url, options) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
    headers: {
      get: () => null
    }
  })
);
