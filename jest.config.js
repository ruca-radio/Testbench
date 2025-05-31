module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'providers/**/*.js',
    'routes/**/*.js',
    'public/js/**/*.js',
    '!**/node_modules/**'
  ],
  verbose: true
};