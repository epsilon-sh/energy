import { parse as parseDuration, toSeconds } from 'iso8601-duration'

export class PriceData extends Array {
  from(start) {
    return this.filter(measurement =>
      new Date(measurement.time) >= new Date(start))
  }

  to(end) {
    return this.filter(measurement =>
      new Date(measurement.time) <= new Date(end))
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
      timestamp: new Date(m.time).getTime(),
      price: m.price,
      domain: m.domain
    }));

    for (const { timestamp, price, domain } of measurements) {
      const groupTimestamp = Math.floor(timestamp / resolutionMs) * resolutionMs;

      if (!groups.has(groupTimestamp)) {
        groups.set(groupTimestamp, {
          time: new Date(groupTimestamp).toISOString(),
          resolution,
          domain,
          price: 0,
          count: 0
        });
      }

      const group = groups.get(groupTimestamp);
      group.price += price;
      group.count += 1;
    }

    // Calculate averages
    for (const group of groups.values()) {
      group.price = group.price / group.count;
      delete group.count;
    }

    return new PriceData(...Array.from(groups.values()));
  }

  sort(compareFn) {
    return new PriceData(...Array.from(this).sort(compareFn));
  }
}

const data = new PriceData();
export default data;

