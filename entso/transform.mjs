// import getPrices from '../entso/query.mjs'
// import { formatDate } from '../entso/utils.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'
import { getDomainName as getHumanDomain } from '../entso/params.mjs'

export const transformPrices = (entsoData, meta = {}) => {
  console.log(Object.keys(meta), 'META KEYS')
  if (entsoData.TimeSeries) {
    const { TimeSeries: data, ...seriesMeta } = entsoData
    console.log({ meta, seriesMeta })

    if (!data.flatMap) {
      if (data.Period)
        return transformPrices(data.Period, { ...meta, ...seriesMeta })
      else {
        console.log(data, 'No flatmap no period god is dead')
        throw new Error()
      }
    }

    const result = data.flatMap(series => transformPrices(series, { ...meta, ...seriesMeta }))
    if (!result) {
      throw new Error('No result?')
    }
    return result
  }

  if (entsoData.Period) {
    const { Period: data, ...periodMeta } = entsoData
    console.log(data, 'period')
    const result = transformPrices(data, { ...meta, ...periodMeta })
    if (!result)
      throw new Error('No results?')
    return result
  }

  if (entsoData.Point) {
    const { Point: data, ...pointMeta } = entsoData
    console.log({ data, meta, pointMeta })
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

    console.log(Object.keys({ ...meta }))

    const result = {
      domain: meta.domain,
      resolution: meta.resolution,
      time: new Date(pointStartMillis),
      price: entsoData['price.amount'],
    }
    console.log({ entsoData, meta, result })
    console.log(meta)
    process.exit(-1)
    return result
  } else {
    throw new Error('No price?')
  }

  console.log({ data: entsoData })
  throw new Error('Not implemented')
}

// const results = entsoData.map(data => {
//   const { TimeSeries: data, ...meta } = series
//   console.log(Object.keys(data))
//   process.exit(-1)

//   const machineDomain = meta['in_Domain.mRID']

//   if (!machineDomain) {
//     console.error(Object.keys(meta), 'no domain in meta')
//   }
//   console.log({ machineDomain: machineDomain })

//   const domain = getHumanDomain(machineDomain)

//   if (!domain) {
//     console.error('No domain found in the data')
//     process.exit(-1)
//   }

//   console.log(meta, 'series meta')
//   const { Period: period } = series
//   console.log(Object.keys(period), 'period keys')

//   if (period.Point && period.Point.length) {
//     const { Point: data, ...meta } = period
//     const interval = meta.timeInterval
//     console.log(data.length, Object.keys(data[0]))
//     console.log({ interval })
//     throw new Error('Not implemented')
//   } else { throw new Error('Invalid period data') }
// })

// for (const series of entsoData) {
//   console.log(series, Object.keys(series), 'in transformPrice')
//   // Get domain from in_Domain

//   // Process each price point
//   for (const point of series) {
//     const { Period: period } = point
//     if (!period) {
//       console.error(point, `point without period?`)
//       process.exit(-1)
//     }

//     // Get resolution
//     const resolution = period?.resolution
//     console.log({ resolution, domain })

//     const extracted = {
//       domain,
//       resolution,
//       time: new Date(period.timeInterval.start).getTime() +
//         (point.position - 1) * toSeconds(parseDuration(resolution)) * 1000,
//       price: point['price.amount']
//     }
//     if (!extracted.domain || !extracted.price) {
//       console.error(extracted, 'extracted with missing domain or price')
//     } else
//       results.push(extracted)
//     console.log(extracted)
//   }
// }
// const data = await getPrices({
//   periodStart: formatDate(new Date('2023-01-01T00:00:00')),
//   periodEnd: formatDate(new Date('2024-01-01T00:00:00')),
// })

// const prices = extractPrices(data)
// console.log(prices[0])
// console.log('...')
// console.log(prices[prices.length - 1])
// console.log(`${prices.length} rows`)

// TO DB :
// domain|resolution|time|price
// FI|PT60M|1672441200000|2.0

// console.log()