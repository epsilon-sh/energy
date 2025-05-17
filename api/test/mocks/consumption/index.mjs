export function resolve(specifier, context, nextResolve) {
  const mocks = {
    '../db.mjs': './db.mjs',
    '../../fingrid/consumptionData.mjs': './consumptionData.mjs',
    '../../fingrid/parseImport.mjs': './parseDsv.mjs',
    '../utils/dateDefaults.mjs': './dateDefaults.mjs',
    'fs/promises': './fsPromises.mjs',
    'multer': './multer.mjs',
    'iso8601-duration': './isoDuration.mjs'
  };

  // Support for query params in imports
  for (const [key, value] of Object.entries(mocks)) {
    if (specifier.startsWith(key)) {
      return {
        url: new URL(value, import.meta.url).href,
        shortCircuit: true
      };
    }
  }

  if (specifier in mocks) {
    return {
      url: new URL(mocks[specifier], import.meta.url).href,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}

// Module loader
export function load(url, context, nextLoad) {
  return nextLoad(url, context);
}
