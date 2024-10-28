// import scsv from '../../fingrid/consumption-2024-09-01.csv?raw'
//
// import {Duration} from "date-fns";
// import {dsvFormat} from 'd3-dsv'
//
// // MeteringPointGSRN;Product Type;Resolution;Unit Type;Reading Type;Start Time;Quantity;Quality
// // 643007574000138589;8716867000030;PT1H;kWh;BN01;2022-12-31T22:00:00Z;0,735000;OK
// // ...
// // 643007574000138589;8716867000030;PT15M;kWh;BN01;2023-12-31T21:30:00Z;0,144000;OK
// // 643007574000138589;8716867000030;PT15M;kWh;BN01;2023-12-31T21:45:00Z;0,245000;OK
// export type Measurement = {
//     startTime: Date
//     duration: Duration
//     quantity: string
//
//     meteringPointGSRN: string
//     productType: string
//     resolution: string
//     unitType: string
//     readingType: string
//     quality: string
// }
//
// const parsed = dsvFormat(';').parse(scsv)
// const headers = parsed.columns.map((h: string) => h
//     .replace(/[^\x00-\x7F]/g, "")
//     .split(' ').join('')).map(h => h
//     .replace(h[0], h[0].toLowerCase()
//     )
// )
//
// const data: ConsumptionSeries = parsed
//     .map(dataPoint => Object
//         .fromEntries(Object
//             .values(dataPoint).map((v, i) => [headers[i], v])))
//     .map(dataPoint => ({
//         ...dataPoint,
//         startTime: new Date(dataPoint.startTime),
//         endTime: new Date(new Date(dataPoint.startTime).setMinutes(new Date(dataPoint.startTime).getMinutes() + 15)),
//         quantity: +dataPoint.quantity.replace(',', '.')
//     }))
//     .filter(d => {
//         if (d.startTime < new Date("2024-08-31T21:00:00Z"))
//             return false
//         if (d.startTime > new Date("2024-09-01T20:45:00Z"))
//             return false
//
//         return true
//     })
//
// export default data
//
// console.log(data[0], 'HERE')
