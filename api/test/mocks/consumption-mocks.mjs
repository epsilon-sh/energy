const mockModules = {
  db: `
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
  `,

  consumptionData: `
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
  `,

  parseDsv: `
    export default function parseDsv(content) {
      globalThis.mockCalls.parseDsv.push(content);
      return globalThis.mockImportedData;
    }
  `,

  dateDefaults: `
    export function getDefaultRange() {
      return {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z'
      };
    }
  `,

  fsPromises: `
    const fsMock = {
      readFile: async function(path, encoding) {
        globalThis.mockCalls.readFile.push({ path, encoding });

        if (globalThis.shouldThrowFileReadError) {
          throw new Error('File read error');
        }

        return 'mock csv content';
      },
      unlink: async function(path) {
        globalThis.mockCalls.unlink.push(path);
        return true;
      }
    };

    export const readFile = fsMock.readFile;
    export const unlink = fsMock.unlink;
    export default fsMock;
  `,

  multer: `
    export default function multer(options) {
      return {
        single: (fieldName) => (req, res, next) => {
          req.file = {
            path: '/tmp/mock-upload-path',
            mimetype: 'text/csv'
          };
          next();
        }
      };
    }
  `,

  isoDuration: `
    export function parse(duration) {
      return { seconds: 86400 };
    }

    export function toSeconds(duration) {
      return 86400;
    }
  `
};

// Module resolver
export function resolve(specifier, context, nextResolve) {
  const mocks = {
    '../db.mjs': 'node:mock-db',
    '../../fingrid/consumptionData.mjs': 'node:mock-consumption-data',
    '../../fingrid/parseImport.mjs': 'node:mock-parse-dsv',
    '../utils/dateDefaults.mjs': 'node:mock-date-defaults',
    'fs/promises': 'node:mock-fs-promises',
    'multer': 'node:mock-multer',
    'iso8601-duration': 'node:mock-iso8601-duration'
  };

  // Support for query params in imports
  for (const [key, value] of Object.entries(mocks)) {
    if (specifier.startsWith(key)) {
      return {
        url: value,
        shortCircuit: true
      };
    }
  }

  if (specifier in mocks) {
    return {
      url: mocks[specifier],
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}

// Module loader
export function load(url, context, nextLoad) {
  switch (url) {
    case 'node:mock-db':
      return {
        format: 'module',
        shortCircuit: true,
        source: mockModules.db
      };

    case 'node:mock-consumption-data':
      return {
        format: 'module',
        shortCircuit: true,
        source: mockModules.consumptionData
      };

    case 'node:mock-parse-dsv':
      return {
        format: 'module',
        shortCircuit: true,
        source: mockModules.parseDsv
      };

    case 'node:mock-date-defaults':
      return {
        format: 'module',
        shortCircuit: true,
        source: mockModules.dateDefaults
      };

    case 'node:mock-fs-promises':
      return {
        format: 'module',
        shortCircuit: true,
        source: mockModules.fsPromises
      };

    case 'node:mock-multer':
      return {
        format: 'module',
        shortCircuit: true,
        source: mockModules.multer
      };

    case 'node:mock-iso8601-duration':
      return {
        format: 'module',
        shortCircuit: true,
        source: mockModules.isoDuration
      };
  }

  return nextLoad(url, context);
}
