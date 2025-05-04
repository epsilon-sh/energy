import { parse as parseDuration, toSeconds } from 'iso8601-duration'

const compareString = (s1, s2) => {
  if (s1 === s2) return 0
  return s1 < s2 ? -1 : 1
}

export const comparePricePoints = (p1, p2) => {
  if (!p1) return -1
  if (!p2) return 1

  if (p2.time > p1.time) return -1
  if (p1.time > p2.time) return 1

  if (p1.resolution !== p2.resolution) {
    if (!p1.resolution) {
      console.error(p1)
      throw new Error('No resolution?')
    }
    const d1 = toSeconds(parseDuration(p1.resolution))
    console.log({ p1, d1, p2 })
    const d2 = toSeconds(parseDuration(p2.resolution))
    if (d1 < d2) return -1
    if (d1 > d2) return 1
  }

  if (p1.domain !== p2.domain) return compareString(p1.domain, p2.domain)

  return 0
}

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
      acc[key] = item[key]
      return acc
    }, {}))
  }

  groupBy(resolution) {
    const targetResolutionMs = toSeconds(parseDuration(resolution)) * 1000
    const resultMap = new Map()
    const groupIndex = new Map()

    for (const measurement of this) {
      const timestamp = new Date(measurement.time).getTime()
      const sourceResolutionMs = toSeconds(parseDuration(measurement.resolution)) * 1000
      const price = measurement.price

      if (sourceResolutionMs <= targetResolutionMs) {
        // Aggregating case (e.g., 15min -> 1hour)
        const targetTimestamp = Math.floor(timestamp / targetResolutionMs) * targetResolutionMs
        const groupKey = [targetTimestamp, measurement.domain].join('|')

        if (!groupIndex.has(groupKey)) {
          groupIndex.set(groupKey, { count: 0, sum: 0 })
          resultMap.set(groupKey, {
            time: new Date(targetTimestamp).toISOString(),
            resolution,
            domain: measurement.domain,
            price: 0
          })
        }

        const index = groupIndex.get(groupKey)
        index.count++
        index.sum += price

        const expectedCount = targetResolutionMs / sourceResolutionMs
        resultMap.get(groupKey).price = index.count < expectedCount
          ? (index.sum / index.count)
          : (index.sum / expectedCount)
      } else {
        // Distributing case (e.g., 1hour -> 15min)
        const subIntervals = sourceResolutionMs / targetResolutionMs

        // Create multiple entries for the smaller intervals
        for (let i = 0; i < subIntervals; i++) {
          const subTimestamp = timestamp + (i * targetResolutionMs)
          const groupKey = [subTimestamp, measurement.domain].join('|')

          resultMap.set(groupKey, {
            time: new Date(subTimestamp).toISOString(),
            resolution,
            domain: measurement.domain,
            price: price
          })
        }
      }
    }

    return new PriceData(...Array.from(resultMap.values()))
  }

  sort(compareFn = comparePricePoints) {
    return new PriceData(...Array.from(this).sort(compareFn))
  }

  insert(...prices) {
    if (!prices.length) return this

    prices.sort(comparePricePoints)

    let insertIndex = this.findIndex(p => comparePricePoints(prices[0], p) <= 0)
    if (insertIndex === -1) insertIndex = this.length

    for (const price of prices) {
      while (insertIndex < this.length && comparePricePoints(this[insertIndex], price) < 0) {
        insertIndex++
      }

      if (insertIndex < this.length && comparePricePoints(this[insertIndex], price) === 0) {
        this[insertIndex] = price
      } else {
        this.splice(insertIndex, 0, price)
      }
      insertIndex++
    }

    return this
  }
}

const data = new PriceData()
export default data
