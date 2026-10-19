module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  clearMocks: true,
  collectCoverageFrom: ['src/auth/**/*.{ts,tsx}', 'src/config/**/*.ts', 'src/lib/**/*.ts'],
};
