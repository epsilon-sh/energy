/**
 * Converts a Date object to ENTSO timestamp format (YYYYMMDDHH00)
 * @param {Date} date - The date to convert
 * @returns {string} The ENTSO timestamp
 */
export const formatDate = date => `${
  date.getUTCFullYear()}${
  date.getUTCMonth() + 1}${
  date.getUTCDate()}${
  date.getUTCHours()
}00`
