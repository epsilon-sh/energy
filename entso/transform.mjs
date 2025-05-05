import { parse as parseDuration, toSeconds } from 'iso8601-duration'
import { getDomainName as getHumanDomain } from '../entso/params.mjs'

export const transformPrices = (entsoData, meta = {}) => {
  if (entsoData.TimeSeries) {
    const { TimeSeries: data, ...seriesMeta } = entsoData

    if (!data.flatMap)
      return transformPrices(data, { ...meta, ...seriesMeta })

    const result = data.flatMap(series => transformPrices(series, { ...meta, ...seriesMeta }))
    if (!result) {
      throw new Error('No result?')
    }
    return result
  }

  if (entsoData.Period) {
    const { Period: data, ...periodMeta } = entsoData
    const result = transformPrices(data, { ...meta, ...periodMeta })
    if (!result)
      throw new Error('No results?')
    return result
  }

  if (entsoData.Point) {
    const { Point: data, ...pointMeta } = entsoData
    // console.log({ data, meta, pointMeta })
    const result = data.flatMap(point => transformPrices(point, { ...meta, ...pointMeta }))
    if (!result)
      throw new Error('No results?')
    return result
  }

  if (!Number.isNaN(entsoData['price.amount'])) {
    if (!meta['in_Domain.mRID'] && !meta.domain)
      throw new Error('No domain!?')
    const { start } = meta.timeInterval
    const durationSeconds = toSeconds(parseDuration(meta.resolution))
    const pointPosition = entsoData.position - 1 // ENTSO-E positions are 1-based
    const startMillis = new Date(start).getTime()
    const pointStartMillis = startMillis + (pointPosition * durationSeconds * 1000)

    // console.log(Object.keys({ ...meta }))

    const result = {
      domain: getHumanDomain(meta['in_Domain.mRID']),
      resolution: meta.resolution,
      time: new Date(pointStartMillis),
      price: entsoData['price.amount'],
    }

    return result
  } else {
    throw new Error('No price?')
  }

  console.log({ data: entsoData })
  throw new Error('Not implemented')
}
