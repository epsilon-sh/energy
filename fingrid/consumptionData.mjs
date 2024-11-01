export { formats } from './parseImport.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'

const compareString = (s1, s2) => {
  if (s1 === s2) return 0;
  return s1 < s2 ? -1 : 1;
}

export const compare = (m1, m2) => {
  const timeDiff = m1.startTime - m2.startTime
  if (timeDiff !== 0) return timeDiff

  if (m1.meteringPoint !== m2.meteringPoint) return compareString(m1.meteringPoint, m2.meteringPoint)

  if (m1.productType !== m2.productType) return compareString(m1.productType, m2.productType)

  if (m1.readingType !== m2.readingType) return compareString(m1.readingType, m2.readingType)

  if (r1 !== r2) {
    const d1 = parseDuration(m1.resolution)
    const d2 = parseDuration(m2.resolution)
    return d2 - d1
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

    measurements.sort(compare);

    let thisIndex = 0;
    while (measurements.length) {
      // Find insertion point
      while (thisIndex < this.length && compare(this[thisIndex], measurements[0]) < 0) {
        thisIndex++;
      }

      // Count duplicates and insertions
      let duplicates = 0;
      let insertCount = 0;
      while (insertCount < measurements.length &&
        (thisIndex + duplicates) < this.length) {
        const comp = compare(this[thisIndex + duplicates], measurements[insertCount]);
        if (comp === 0) {
          // Duplicate found - will replace existing element
          duplicates++;
          insertCount++;
        } else if (comp > 0) {
          // New element to insert
          insertCount++;
        } else {
          break;
        }
      }

      // Add remaining measurements if we're at the end of this
      if ((thisIndex + duplicates) >= this.length) {
        insertCount = measurements.length;
      }

      // Perform the splice operation
      this.splice(thisIndex, duplicates, ...measurements.splice(0, insertCount));
      thisIndex += insertCount;
    }

    return this;
  }

  from(start) {
    return this.filter(measurement =>
      new Date(measurement.startTime) >= new Date(start))
  }

  to(end) {
    return this.filter(measurement =>
      new Date(measurement.startTime) <= new Date(end));
  }

  limit(count) {
    return this.slice(0, count)
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
