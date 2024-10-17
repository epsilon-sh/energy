import scsv from '../../fingrid/consumption-2024-09-01.csv?raw'

import {dsvFormat} from 'd3-dsv'

// {
//   "meteringPointGSRN": "643007574000138589",
//   "productType": "8716867000030",
//   "resolution": "PT15M",
//   "unitType": "kWh",
//   "readingType": "BN01",
//   "startTime": new Date("2024-08-31T21:00:00Z"),
//   "quantity": 0.111000,
//   "quality": "OK"
// }
export type ConsumptionPoint = {
    startTime: Date
    endTime: Date
    quantity: number

    meteringPointGSRN?: string
    productType?: string
    resolution?: string
    unitType?: string
    readingType?: string
    quality?: string
}

export type ConsumptionSeries = ConsumptionPoint[]

const parsed = dsvFormat(';').parse(scsv)
const headers = parsed.columns.map((h: string) => h
    .replace(/[^\x00-\x7F]/g, "")
    .split(' ').join('')).map(h => h
    .replace(h[0], h[0].toLowerCase()
    )
)

const data: ConsumptionSeries = parsed
    .map(dataPoint => Object
        .fromEntries(Object
            .values(dataPoint).map((v, i) => [headers[i], v])))
    .map(dataPoint => ({
        ...dataPoint,
        startTime: new Date(dataPoint.startTime),
        endTime: new Date(new Date(dataPoint.startTime).setMinutes(new Date(dataPoint.startTime).getMinutes() + 15)),
        quantity: +dataPoint.quantity.replace(',', '.')
    }))
    .filter(d => {
        if (d.startTime < new Date("2024-08-31T21:00:00Z"))
            return false
        if (d.startTime > new Date("2024-09-01T20:45:00Z"))
            return false

        return true
    })

export default data

console.log(data[0], 'HERE')
