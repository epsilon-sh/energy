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

const parser = new XMLParser()

const startDate = new Date()
const endDate = new Date()
const BASE_URL = 'https://web-api.tp.entsoe.eu/api'

const defaultParams = {
  securityToken: process.env.ENTSO_TOKEN || 'ENTSO_GUEST',
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

  console.log(`GET ENTSO RANGE ${params.periodStart} - ${params.periodEnd} | ${url}`)

  const response = await fetch(url)

  if (!response.ok)
    console.error('Error fetching data', response.status || response.error)

  const expected = 'text/xml'
  const contentType = response.headers.get('content-type')
  console.log('Got response type:', contentType)

  const page = await response.text()

  if (contentType === expected) {
    console.log('Parsing XML page.')
    const parsed = parser.parse(page)
    console.log(parsed.Publication_MarketDocument.TimeSeries[0].Period)

    if (parsed.Publication_MarketDocument) {
      console.log(parsed.Publication_MarketDocument)
      return parsed.Publication_MarketDocument
    }
  } else {
    console.error(`Unsupported response body type: ${contentType} (expect ${expected})`)
    console.log(page)
    return []
  }

  throw new Error('Error handling ENTSO (nimpl)')
}

export default getPrices
