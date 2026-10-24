module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/visual-setup.ts'],
  collectCoverageFrom: ['src/auth/**/*.{ts,tsx}', 'src/config/**/*.ts', 'src/lib/**/*.ts'],
};
