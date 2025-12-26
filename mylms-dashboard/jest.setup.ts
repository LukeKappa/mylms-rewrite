import '@testing-library/jest-dom';

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

// Mock Puppeteer to avoid launching browser in tests
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));
