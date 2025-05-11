export function getDatabase() {
  globalThis.mockCalls.getDatabase.push(arguments);

  if (globalThis.shouldThrowDatabaseError) {
    throw new Error('Database error');
  }

  return {
    prepare: () => ({
      all: () => globalThis.mockDbData,
      run: () => {}
    }),
    transaction: (fn) => (...args) => fn(...args)
  };
}
