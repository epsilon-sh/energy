export default function parseDsv(content) {
  globalThis.mockCalls.parseDsv.push(content);
  return globalThis.mockImportedData;
}
