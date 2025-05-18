export type PricePoint = {
  time: string
  value: string
}
export type PriceSeries = PricePoint[]

// import data from '../../../common/data/spot.json'
const data: PriceSeries = [];

// const prices = data.map(({ time, value }) => {
//   const [ hours, minutes ] = time.split(':').map(Number)
//   const date = new Date()

//   return ({
//     time: date.setUTCHours(hours, minutes),
//     value: Number(value)
//   })
// })

// export default prices

export default data;
