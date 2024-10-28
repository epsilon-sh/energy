// ENTSO timestamp in format YYYYMMDDHH
//   console.log(`ENTSO ${timestamp}`)
//   const year = timestamp.slice(0, 4)
//   const month = timestamp.slice(4, 6)
//   const day = timestamp.slice(6, 8)
//   const hour = timestamp.slice(8, 10)

//   const date = new Date(`${year}-${month}-${day}T${hour}:00:00Z`)
//   console.log(`Dated ${date}`)
//   return date
// }

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

import { formatDate } from './utils.mjs'

import {
  getDocumentTypeKey,
  getDomainKey,
} from './params.mjs'

import { XMLParser } from 'fast-xml-parser'

const { parse: parseXML } = new XMLParser()

const startDate = new Date()
const endDate = new Date()

const defaultQuery = {
  range: {
    start: startDate,
    end: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
  },
}

const defaultRequest = {
  ...defaultQuery,
  securityToken: 'ENTSO_GUEST',
  documentType: getDocumentTypeKey('DAY_AHEAD_PRICES'),
  in_Domain: getDomainKey('FI'),
  out_Domain: getDomainKey('FI'),
  periodStart: formatDate(startDate),
  periodEnd: formatDate(endDate),
}


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
  const page = await response.text()

  console.log('Parsing XML page.')
  const parsed = parseXML(page)

  if (parsed.Publication_MarketDocument)
    return parsed.Publication_MarketDocument

  throw new Error('Error handling ENTSO (nimpl)')
}

export default getPrices
