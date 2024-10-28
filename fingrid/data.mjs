export { formats } from './parseImport.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'

export const compare = (m1, m2) => {
  const timeDiff = m1.startTime - m2.startTime
  if (timeDiff !== 0) return timeDiff

  if (m1.meteringPointGSRN !== m2.meteringPointGSRN) return 1;

  const r1 = toSeconds(parseDuration(m2.resolution))
  const r2 = toSeconds(parseDuration(m1.resolution))
  if (r1 !== r2) return r1 - r2

  return 0;
}

export class ConsumptionData extends Array {
  from(start) {
    return this.filter(measurement =>
      new Date(measurement.startTime) >= new Date(start))
  }

  to(end) {
    return this.filter(measurement =>
      new Date(measurement.startTime) <= new Date(end));
  }

  limit(count) {
    return new ConsumptionData(...this).slice(0, count)
  }

  match(pattern) {
    return this.filter(item => Object.keys(pattern)
      .every(key => item[key] === pattern[key]))
  }

  select(keys) {
    return this.map(item => keys.reduce((acc, key) => {
      acc[key] = item[key];
      return acc;
    }, {}))
  }

  groupBy(resolution) {
    const resolutionMs = toSeconds(parseDuration(resolution)) * 1000;
    const groups = new Map();

    const measurements = this.map(m => ({
      timestamp: new Date(m.startTime).getTime(),
      quantity: parseFloat(m.quantity.replace(',', '.'))
    }));

    for (const { timestamp, quantity } of measurements) {
      const groupTimestamp = Math.floor(timestamp / resolutionMs) * resolutionMs;

      if (!groups.has(groupTimestamp)) {
        groups.set(groupTimestamp, {
          startTime: new Date(groupTimestamp).toISOString(),
          resolution,
          quantity: 0
        });
      }

      groups.get(groupTimestamp).quantity += quantity;
    }

    return new ConsumptionData(...Array.from(groups.values()));
  }
}

const data = new ConsumptionData()

export default data
