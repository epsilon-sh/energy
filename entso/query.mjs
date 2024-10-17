import { XMLParser } from 'fast-xml-parser'

// import knownParams, {
import {
  getDocumentTypeKey,
  getDomainKey,
} from './params.mjs'

const Parser = new XMLParser()
const formatDate = date => date => `${date.getUTCFullYear()}${date.getUTCMonth() + 1}${date.getUTCDate()}${date.getUTCHours()}00`

const defaults = {
  range: {
    start: new Date(),
    end: new Date().setHours(defaults.start),
  },
}
const startTime = new Date(START_UTC)
const endTime = new Date(END_UTC)

//   console.log(`ENTSO ${timestamp}`)

//   const year = timestamp.slice(0, 4)
//   const month = timestamp.slice(4, 6)
//   const day = timestamp.slice(6, 8)
//   const hour = timestamp.slice(8, 10)

//   const date = new Date(`${year}-${month}-${day}T${hour}:00:00Z`)
//   console.log(`Dated ${date}`)
//   return date
// }

const config = {
  ...defaults,
  securityToken: ENTSO_TOKEN || 'ENTSO_GUEST',
  documentType: getDocumentTypeKey('DAY_AHEAD_PRICES'),
  in_Domain: getDomainKey('FI'),
  out_Domain: getDomainKey('FI'),
  periodStart: date2entsoTimestamp(startTime),
  periodEnd: date2entsoTimestamp(endTime),
}

// Translate params to human readable
// const formatParams = params => {
//   return {
//     documentType: knownParams.documentTypes[params.documentType] || params.documentType,
//     inDomain: knownParams.domains[params.in_Domain] || params.in_Domain,
//     outDomain: knownParams.domains[params.out_Domain] || params.out_Domain,
//     start: entsoTimestamp2date(params.periodStart || params.start),
//     end: entsoTimestamp2date(params.periodEnd || params.end),
//   }
// }

const getPrices = async (params = defaultParams) => {
  const url = new URL(BASE_URL)
  params = { ...defaultParams, ...params }
  url.search = new URLSearchParams(params)

  console.log(`GET ENTSO RANGE ${params.periodStart} - ${params.periodEnd}`)

  const response = await fetch(url)

  if (!response.ok)
    console.error('Error fetching data', response.status || response.error)

  const contentType = response.headers.get('content-type')
  const expected = 'text/xml'

  if (contentType !== expected)
    throw new Error(`Unsupported response body type: ${contentType} (expect ${expected})`)

  console.log('Got response type:', contentType)
  const data = await response.text()

  console.log('Parsing XML data.')
  const parsed = Parser.parse(data)

  if (parsed.Publication_MarketDocument)
    return parsed.Publication_MarketDocument

  throw new Error('Error handling ENTSO (nimpl)')
}

export default getPrices
