import { parse as parseDuration, toSeconds } from 'iso8601-duration'
import { getDomainName as getHumanDomain } from '../entso/params.mjs'

export const transformPrices = (entsoData, meta = {}) => {
  if (!entsoData) {
    throw new Error('No data provided')
  }

  if (entsoData.TimeSeries) {
    const { TimeSeries: data, ...seriesMeta } = entsoData
    if (Array.isArray(data)) {
      return data.flatMap(series => transformPrices(series, { ...meta, ...seriesMeta }))
    }
    return transformPrices(data, { ...meta, ...seriesMeta })
  }

  if (entsoData.Period) {
    const { Point, timeInterval, resolution, ...periodMeta } = entsoData.Period
    if (!Point || !timeInterval || !resolution) {
      throw new Error('Invalid period data structure')
    }
    
    // Pass down timeInterval and resolution along with other meta
    return transformPrices(Point, { ...meta, timeInterval, resolution, ...periodMeta })
  }

  if (Array.isArray(entsoData)) {
    // This is an array of points
    return entsoData.map((point, idx) => {
      const { timeInterval, resolution } = meta
      if (!timeInterval || !resolution) {
        throw new Error('Missing timeInterval or resolution in meta')
      }

      const durationSeconds = toSeconds(parseDuration(resolution))
      const position = point.position ? parseInt(point.position) - 1 : idx
      const startMillis = new Date(timeInterval.start).getTime()
      const pointStartMillis = startMillis + (position * durationSeconds * 1000)

      return {
        domain: meta['in_Domain.mRID'] ? getHumanDomain(meta['in_Domain.mRID']) : meta.domain,
        resolution: resolution,
        time: new Date(pointStartMillis).toISOString(),
        price: parseFloat(point['price.amount']),
      }
    })
  }

  throw new Error('Unsupported data format')
}