import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'
import { endOfDay, sub } from 'date-fns'
import { formatDate } from '../../entso/utils.mjs'
import { getDocumentTypeKey, getDomainKey } from '../../entso/params.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://web-api.tp.entsoe.eu/api'

const dumpPriceData = async () => {
  const end = endOfDay(new Date())
  const start = sub(end, { days: 30 })

  console.log(`Fetching prices from ${formatDate(start)} to ${formatDate(end)}`)

  const params = {
    securityToken: process.env.ENTSO_TOKEN || 'ENTSO_GUEST',
    documentType: getDocumentTypeKey('DAY_AHEAD_PRICES'),
    in_Domain: getDomainKey('FI'),
    out_Domain: getDomainKey('FI'),
    periodStart: formatDate(start),
    periodEnd: formatDate(end),
  }

  const url = new URL(BASE_URL)
  url.search = new URLSearchParams(params)

  console.log(`Fetching from: ${url}`)
  const response = await fetch(url)
  const xml = await response.text()

  writeFileSync(`${__dirname}/priceDump.xml`, xml)
  console.log('Raw XML price data written to priceDump.xml')
}

dumpPriceData()
