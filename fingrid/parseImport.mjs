import stripBom from "strip-bom";
import { parse as parseDuration } from 'iso8601-duration';

// MeteringPointGSRN;Product Type;Resolution;Unit Type;Reading Type;Start Time;Quantity;Quality
// 643007574000138589;8716867000030;PT1H;kWh;BN01;2022-12-31T22:00:00Z;0,735000;OK
// ...
// 643007574000138589;8716867000030;PT15M;kWh;BN01;2023-12-31T21:30:00Z;0,144000;OK
// 643007574000138589;8716867000030;PT15M;kWh;BN01;2023-12-31T21:45:00Z;0,245000;OK
/**
 * @typedef {Object} Measurement
 * @property {Date} startTime - The start time of the measurement.
 * @property {Duration} duration - The duration of the measurement.
 * @property {string} quantity - The quantity measured.
 * @property {string} [meteringPointGSRN] - The GSRN of the metering point.
 * @property {string} [productType] - The type of product.
 * @property {string} [resolution] - The resolution of the measurement.
 * @property {string} [unitType] - The type of unit.
 * @property {string} [readingType] - The type of reading.
 * @property {string} [quality] - The quality of the measurement.
 */

const SEPARATOR = ';'
const EXPECTED_HEADER = 'MeteringPointGSRN;Product Type;Resolution;Unit Type;Reading Type;Start Time;Quantity;Quality'

const id = x => x
const dt = st => new Date(st)
const qty = qty => qty.replace(',', '.')
const ndef = x => x === undefined || x === ''
const isISO8601D = (duration) => {
  try {
    parseDuration(duration);
    return true;
  } catch {
    return false;
  }
};

export const formats = {
  meteringPoint: id,
  productType: id,
  resolution: id,
  unitType: id,
  readingType: id,
  startTime: dt,
  quantity: qty,
  quality: id,
}

export const parseFields = fields => {
  const entries = Object.entries(formats)
    .map(([key, format], ki) => [key, format(fields[ki])]);

  return Object.fromEntries(entries);
};

export const validateHeader = (header) => {
  return stripBom(header).trim() === EXPECTED_HEADER;
};

/**
 * Validates a DSV line into an array of values.
 * @param {string} line - The DSV row string to validate.
 * @param {string} [sep=SEPARATOR] - The delimiter used in the DSV row string.
 * @returns {string[] | undefined} - The array of values, if the row is valid.
 */
export const validateRow = (line, sep = SEPARATOR) => {
  if (!line.length)
    return console.warn(`Skip empty line.`);

  const fields = line.split(sep);

  if (fields.length !== 8)
    return console.warn(`Invalid field count: ${fields.length} (${JSON.stringify(line)})`);

  const [
    _meteringPointGSRN,
    _productType,
    resolution,
    _unitType,
    _readingType,
    startTime,
    quantity,
    _quality
  ] = fields;

  if (fields.some(ndef))
    return console.warn(`Missing fields in row: ${line}`);

  if (!dt(startTime))
    return console.warn(`Invalid start time: ${startTime}`);

  if (isNaN(qty(quantity)))
    return console.warn(`Invalid quantity: ${quantity}`);

  if (!isISO8601D(resolution))
    return console.warn(`Invalid resolution: ${resolution}`);

  return fields;
};

/**
 * Extracts and parses a DSV row string into a measurement object if valid.
 * @param {string} line - The DSV row string to extract and parse.
 * @param {string} [delim=SEPARATOR] - The delimiter used in the DSV row string.
 * @returns {Measurement | undefined} The parsed measurement object, or undefined if the row is invalid.
 */
export const extractRow = (line, delim = SEPARATOR) => {
  const fields = validateRow(line, delim)

  if (fields)
    return parseFields(fields);
};

export const parseDsv = (fileContent, delimiter = SEPARATOR) => {
  const [header, ...lines] = stripBom(fileContent).split('\n');

  if (!validateHeader(header))
    throw new Error('Invalid header in DSV');

  const parsed = lines.reduce((measurements, line) => {
    const measurement = extractRow(line, delimiter);

    if (measurement)
      measurements.push(measurement);

    return measurements;
  }, []);

  console.log(`parsed ${parsed.length} consumption measurements`);
  return parsed;
};

export default parseDsv;
