// Mock database pool for tests
export const pool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};
