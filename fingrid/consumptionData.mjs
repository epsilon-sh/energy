export { formats } from './parseImport.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'

const compareString = (s1, s2) => {
  if (s1 === s2) return 0;
  return s1 < s2 ? -1 : 1;
}

export const compare = (m1, m2) => {
  const timeDiff = new Date(m1.startTime).getTime() - new Date(m2.startTime).getTime()
  if (timeDiff !== 0) return timeDiff

  if (m1.meteringPoint !== m2.meteringPoint) return compareString(m1.meteringPoint, m2.meteringPoint)

  if (m1.productType !== m2.productType) return compareString(m1.productType, m2.productType)

  if (m1.readingType !== m2.readingType) return compareString(m1.readingType, m2.readingType)
  if (m1.resolution !== m2.resolution) {
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
    console.log('inserting', measurements.length, 'into', this.length)
    if (!measurements?.length) return this;

    measurements.sort(compare);

    let offset = 0;
    let insert = 0;
    let dropped = 0;
    let inserted = 0;
    while (measurements.length) {
      const thisItem = this[offset + insert];
      const measurement = measurements[insert];

      if (!thisItem) {
        console.log('insert rest', measurements.length - insert, 'at', offset + insert)
        insert += measurements.length - insert;
        this.splice(offset, 0, ...measurements.splice(0, insert));
        inserted += insert;
        insert = 0;
        break;
      }

      if (!measurement) {
        if (insert) {
          console.log(`insert ${insert} at ${offset}`)
          this.splice(offset, 0, ...measurements.splice(0, insert));
          inserted += insert;
          offset += insert + 1;
          insert = 0;
        }
        break; // done
      }

      const comp = compare(measurement, thisItem);

      if (comp < 0) {
        insert++;
        console.log('from', offset, 'offset', insert)
      }

      if (comp === 0) {
        measurements.splice(insert, 1);
        dropped++;
      }

      if (comp > 0) {
        // console.log('stop insert', insert, 'at', offset + insert)
        this.splice(offset, 0, ...measurements.splice(0, insert));
        // console.log(`insert ${insert} at ${offset} offset`, insert)
        inserted += insert;
        offset += insert + 1;
        insert = 0;
      }

    }

    console.log(`${inserted} inserted, ${dropped} skipped, ${measurements.length} left`)
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
