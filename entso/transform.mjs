// import getPrices from '../entso/query.mjs'
// import { formatDate } from '../entso/utils.mjs'
import { parse as parseDuration, toSeconds } from 'iso8601-duration'
import { getDomainHuman } from '../entso/params.mjs'

export const transformPrices = entsoData => {
  const { TimeSeries } = entsoData
  const results = []

  if (!TimeSeries) {
    return results
  }

  for (const series of TimeSeries) {
    // Get domain from in_Domain
    const { Period } = series
    const domain = getDomainHuman(series['in_Domain.mRID'])
      || series['in_Domain.mRID'].split('-')[0].slice(-2)
      || series['in_Domain.mRID']

    // Get resolution
    const resolution = Period.resolution

    // Process each price point
    for (const point of Period.Point) {
      results.push({
        domain,
        resolution,
        time: new Date(Period.timeInterval.start).getTime() +
          (point.position - 1) * toSeconds(parseDuration(resolution)) * 1000,
        price: point['price.amount']
      })
    }
  }

  return results
}

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