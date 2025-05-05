export { formats } from './parseImport.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'

const compareString = (s1, s2) => {
  if (s1 === s2) return 0;
  return s1 < s2 ? -1 : 1;
}

// Define expected duration order
const durationOrder = {
  "PT15M": 0,
  "PT30M": 1,
  "PT1H": 2
};

export const compare = (m1, m2) => {
  // Compare by time first (normalize to ISO string format)
  const t1 = new Date(m1.startTime).toISOString();
  const t2 = new Date(m2.startTime).toISOString();
  if (t1 !== t2) {
    return t1 < t2 ? -1 : 1;
  }

  // Then by meteringPoint using string comparison
  if (m1.meteringPoint !== m2.meteringPoint) {
    return m1.meteringPoint < m2.meteringPoint ? -1 : 1;
  }

  // Then by resolution using predefined order
  if (m1.resolution !== m2.resolution) {
    const d1 = durationOrder[m1.resolution] ?? Infinity;
    const d2 = durationOrder[m2.resolution] ?? Infinity;
    return d1 - d2;
  }

  // Then by productType
  if (m1.productType !== m2.productType) {
    return m1.productType < m2.productType ? -1 : 1;
  }

  // Finally by readingType
  if (m1.readingType !== m2.readingType) {
    return m1.readingType < m2.readingType ? -1 : 1;
  }

  return 0;
}

export const toKWh = (quantity, unit) => {
  const conversions = {
    'Wh': 0.001,
    'kWh': 1,
    'MWh': 1000,
    'GWh': 1000000
  };

  return quantity * (conversions[unit] || 1);
}

export const fromKWh = (quantity, targetUnit) => {
  const conversions = {
    'Wh': 0.001,
    'kWh': 1,
    'MWh': 1000,
    'GWh': 1000000
  };

  return quantity / (conversions[targetUnit] || 1);
}

export class ConsumptionData extends Array {
  insert(...measurements) {
    if (!measurements?.length) return this;

    // Create a map to track existings measurements by key
    const replacementMap = new Map();
    
    // Function to create unique key for each measurement
    const getKey = (m) => `${m.startTime}|${m.meteringPoint}|${m.resolution}|${m.productType}|${m.readingType}`;
    
    // Map existing measurements
    for (const measurement of this) {
      replacementMap.set(getKey(measurement), measurement);
    }

    // Process new measurements, replacing existing ones
    for (const measurement of measurements) {
      replacementMap.set(getKey(measurement), measurement);
    }

    // Convert back to array and sort
    const allMeasurements = Array.from(replacementMap.values());
    allMeasurements.sort(compare);

    // Clear and refill this array
    this.length = 0;
    this.push(...allMeasurements);
    
    return this;
  }

  from(start) {
    const startDate = new Date(start)
    return this.filter(measurement =>
      new Date(measurement.startTime) >= startDate)
  }

  to(end) {
    const endDate = new Date(end)
    return this.filter(measurement =>
      new Date(measurement.startTime) <= endDate);
  }

  limit(count) {
    return this.slice(0, count)
  }

  match(pattern) {
    const match = item => Object.keys(pattern)
      .every(key => typeof pattern[key] === 'function'
        ? pattern[key](item[key])
        : pattern[key] === item[key])

    return this.filter(match)
  }

  select(keys) {
    return this.map(item => keys.reduce((acc, key) => {
      acc[key] = item[key];
      return acc;
    }, {}))
  }

  groupBy(resolution) {
    const targetResolutionMs = toSeconds(parseDuration(resolution)) * 1000;
    const resultMap = new Map();
    const groupIndex = new Map();

    for (const measurement of this) {
      const timestamp = new Date(measurement.startTime).getTime();
      const sourceResolutionMs = toSeconds(parseDuration(measurement.resolution)) * 1000;
      const baseQuantity = toKWh(
        parseFloat(measurement.quantity.toString().replace(',', '.')),
        measurement.unit
      );

      if (sourceResolutionMs <= targetResolutionMs) {
        // Aggregating case (e.g., 15min -> 1hour)
        const targetTimestamp = Math.floor(timestamp / targetResolutionMs) * targetResolutionMs;
        const groupKey = [
          targetTimestamp,
          measurement.meteringPoint,
          measurement.productType,
          measurement.readingType
        ].join('|');

        if (!groupIndex.has(groupKey)) {
          groupIndex.set(groupKey, { count: 0, sum: 0 });
          resultMap.set(groupKey, {
            startTime: new Date(targetTimestamp).toISOString(),
            resolution,
            unit: 'kWh',
            meteringPoint: measurement.meteringPoint,
            productType: measurement.productType,
            readingType: measurement.readingType,
            quantity: 0
          });
        }

        const index = groupIndex.get(groupKey);
        index.count++;
        index.sum += baseQuantity;

        const expectedCount = targetResolutionMs / sourceResolutionMs;
        resultMap.get(groupKey).quantity = fromKWh(
          index.count < expectedCount
            ? (index.sum / index.count) * expectedCount
            : index.sum,
          'kWh'
        );
      } else {
        // Distributing case (e.g., 1hour -> 15min)
        const subIntervals = sourceResolutionMs / targetResolutionMs;
        const quantityPerInterval = baseQuantity / subIntervals;

        // Create multiple entries for the smaller intervals
        for (let i = 0; i < subIntervals; i++) {
          const subTimestamp = timestamp + (i * targetResolutionMs);
          const groupKey = [
            subTimestamp,
            measurement.meteringPoint,
            measurement.productType,
            measurement.readingType
          ].join('|');

          resultMap.set(groupKey, {
            startTime: new Date(subTimestamp).toISOString(),
            resolution,
            unit: 'kWh',
            meteringPoint: measurement.meteringPoint,
            productType: measurement.productType,
            readingType: measurement.readingType,
            quantity: fromKWh(quantityPerInterval, 'kWh')
          });
        }
      }
    }

    return new ConsumptionData(...Array.from(resultMap.values())
      .sort(compare)
    );
  }
}

const data = new ConsumptionData()

export default data
