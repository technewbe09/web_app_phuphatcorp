/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^../config/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
    '^../../config/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
  },
};
