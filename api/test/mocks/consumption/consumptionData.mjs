export default {
  insert: (...args) => {
    globalThis.mockCalls.dataInsert.push(args);
  },
  push: (...args) => {
    globalThis.mockCalls.dataPush.push(args);
  },
  from: () => ({
    to: () => ({
      match: () => ({
        groupBy: () => globalThis.mockResponseData
      })
    })
  }),
  length: 100
};
