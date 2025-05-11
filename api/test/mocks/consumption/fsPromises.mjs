export const readFile = async function (path, encoding) {
  globalThis.mockCalls.readFile.push({ path, encoding });

  if (globalThis.shouldThrowFileReadError) {
    throw new Error('File read error');
  }

  return 'mock csv content';
};

export const unlink = async function (path) {
  globalThis.mockCalls.unlink.push(path);
  return true;
};

export default { readFile, unlink };
