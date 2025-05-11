import { writeFileSync } from 'fs'

const location = new URL("https://ev-shv-prod-app-wa-consumerapi1.azurewebsites.net/api/productlist")
const output = import.meta.filename.replace(new RegExp(/\.mjs$/), ".json")

const data = fetch(location).then(res => res.json())

let currentPrice = null
const updateCurrentPrice = async () => {
  const UTCHour = new Date().getUTCHours()
  const start = UTCHour > 22 ? new Date() : new Date(new Date().setDate(new Date().getDate() - 1))
  const end = UTCHour > 22 ? new Date(new Date().setDate(new Date().getDate() + 1)) : new Date()

  const range = {
    start: new Date(start.setUTCHours(22, 0, 0, 0)).toISOString(),
    end: new Date(end.setUTCHours(22, 0, 0, 0)).toISOString()
  }

  const hoursSinceStart = (new Date() - new Date(range.start)) / (1000 * 60 * 60)
  const index = Math.floor(hoursSinceStart).toString()

  return fetch("https://newtransparency.entsoe.eu/market/energyPrices/load", {
    "headers": {
      "accept": "application/json",
      "Content-Type": "application/json",
    },
    "body": `{\"dateTimeRange\":{\"from\":\"${range.start}\",\"to\":\"${range.end}\"},\"areaList\":[\"BZN|10YFI-1--------U\"],\"timeZone\":\"CET\",\"sorterList\":[],\"intervalPageInfo\":{\"itemIndex\":0,\"pageSize\":10},\"filterMap\":{}}`,
    "method": "POST"
  }).then(res => res.json())
    .then(res => res.instanceList[0].curveData.periodList[0].pointMap[index][0])
    .then(PerMWh => +(PerMWh / 1000 * 100).toFixed(2)) // cts/kWh
    .then(price => {
      const result = {
        value: price,
        lastUpdated: new Date().getTime()
      }
      currentPrice = result
      return result
    })
}

export const getCurrentPrice = async () => {
  // Update every 5 minutes
  if (!currentPrice || currentPrice.lastUpdated < new Date().getTime() - 1000 * 60 * 5)
    return updateCurrentPrice()

  return currentPrice
}

console.log((await data).length, 'products total')
console.log((await getCurrentPrice()).value, 'cts/kWh')

// writeFileSync(output, JSON.stringify(data, null, 2))

const updateBestProducts = async (parameters = {}) => {
  console.log('updating best products')
  return data.then(products => products.reduce((acc, product) => {
    // Extract
    const {
      Id,
      Details: {
        TargetGroup,
        PricingModel,
        Pricing: { PriceComponents },
        AvailabilityArea,
        ConsumptionLimitation: {
          MinXKWhPerY,
          MaxXKWhPerY,
        },
      },
    } = product

    // Validate
    const groupFilter = !parameters.targetGroup ? ['Household', 'Both']
      : parameters.targetGroup === 'Both' ? ['Household', 'Both', 'Company']
        : ['Both', parameters.targetGroup]
    if (!groupFilter.includes(TargetGroup)) return acc

    const modelFilter = parameters.pricingModel ? [parameters.pricingModel] : ['FixedPrice', 'Spot']
    if (!modelFilter.includes(PricingModel)) return acc

    for (const { PriceComponentType } of PriceComponents) {
      if (!['General', 'Monthly', 'Annual'].includes(PriceComponentType)) return acc
    }

    const postalCode = parameters.postalCode
    if (!AvailabilityArea.IsNational && !AvailabilityArea.PostalCodes.includes(postalCode)) return acc

    const consumption = parameters.consumption || 5000
    if (consumption < MinXKWhPerY || consumption > MaxXKWhPerY) return acc

    // Transform
    const pricing = PriceComponents.reduce((acc, { OriginalPayment }) => ({
      ...acc,
      [OriginalPayment.PaymentUnit]: OriginalPayment.Price
    }), {})

    const costPerKWh = (pricing.CentPerKiwattHour + (PricingModel === 'Spot' ? currentPrice.value : 0))

    const consumptionCost = costPerKWh * consumption / 100
    const subscriptionCost = pricing.EurPerMonth * 12
    const totalCost = consumptionCost + subscriptionCost

    if (!acc[PricingModel] || acc[PricingModel].total > totalCost) {
      const best = {
        Id,
        TargetGroup,
        PricingModel,
        // Note: edge case with fuse types override?
        PriceComponents: pricing,
        AvailabilityArea,
        ConsumptionLimitation: {
          MinXKWhPerY,
          MaxXKWhPerY,
        },
        annualizedCost: {
          consumption: +(consumptionCost).toFixed(2),
          subscription: +(subscriptionCost).toFixed(2),
          total: +(totalCost).toFixed(2),
        },
        instantPricing: {
          CentPerKiwattHour: +(costPerKWh).toFixed(2),
          EurPerMonth: +(pricing.EurPerMonth).toFixed(2),
        }
      }

      acc[PricingModel] = best
    }

    return acc
  }, {}))
}

// TODO getBestProducts caches by postal code + lastUpdated invalidate every 24hours
export const getBestProducts = updateBestProducts

writeFileSync(output, JSON.stringify(await data, null, 2))

export default data
