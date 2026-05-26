export default {
  test: {
    root: './frontend',
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
};
