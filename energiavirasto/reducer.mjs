const DEFAULT_FULL = true; // include contract company and name

const extractPriceInfo = (explicitPriceComponents) => {
  let centsPerKiwattHour = 0.0;
  let euroPerMonth = 0.0;

  explicitPriceComponents.forEach((component) => {
    switch (component.PriceComponentType) {
      case "Monthly":
        euroPerMonth += component.OriginalPayment.Price;
        break;
      case "General":
        centsPerKiwattHour += component.OriginalPayment.Price;
        break;
      case "DayTime":
      case "NightTime":
        // only true, if day and night are 50/50
        centsPerKiwattHour += component.OriginalPayment.Price / 2.0;
        break;
    }
  });

  return {
    centsPerKiwattHour,
    euroPerMonth,
  };
};

export const filterContracts = (allContracts, filters) => {
  if (!Array.isArray(allContracts)) {
    console.error("Expected array of contracts, got:", typeof allContracts);
    return [];
  }

  return allContracts
    .filter((c) => {
      if (filters.pricingModel !== c.Details.PricingModel) return false;

      if (
        !(filters.targetGroup !== "Both"
          ? filters.targetGroup === c.Details.targetGroup
          : true)
      )
        return false;

      if (
        parseFloat(filters.limitMinKWhPerY) <
        c.Details.ConsumptionLimitation.MinXKWhPerY
      )
        return false;

      if (
        filters.limitMaxKWhPerY !== "null" &&
        parseFloat(filters.limitMaxKWhPerY) >
          c.Details.ConsumptionLimitation.MaxXKWhPerY
      )
        return false;

      return true;
    })
    .map((ec) => {
      const { centsPerKiwattHour, euroPerMonth } = extractPriceInfo(
        ec.Details.Pricing.PriceComponents,
      );

      return {
        id: ec.Id,
        name: ec.Name,
        company: ec.Company.Name,
        pricingModel: ec.Details.PricingModel,
        centsPerKiwattHour,
        euroPerMonth,
      };
    });
};

/**
 * Gets the cheapest contract of given pricingModel from the list
 * @param {Array} contracts - Array of contracts to search through
 * @param {string} pricingModel - Type of pricing model to filter for ("Spot" or "FixedPrice")
 * @param {boolean} full - Whether to include the contract company and name
 * @returns {Object|null} The cheapest contract of the specified type, or null if none found
 */
export const getCheapest = (contracts, pricingModel, full = DEFAULT_FULL) => {
  if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
    return null;
  }

  // Assuming average consumption of 1000 kWh per month for comparison
  const YEARLY_KWH = 1000 * 12;

  const typeContracts = contracts.filter(
    (contract) => contract.pricingModel === pricingModel,
  );

  if (typeContracts.length === 0) {
    return null;
  }

  const cheapest = typeContracts.reduce((cheapest, current) => {
    // Convert all costs to cents for comparison
    const currentTotalCost =
      current.centsPerKiwattHour * YEARLY_KWH + current.euroPerMonth * 100;
    const cheapestTotalCost =
      cheapest.centsPerKiwattHour * YEARLY_KWH + cheapest.euroPerMonth * 100;

    return currentTotalCost < cheapestTotalCost ? current : cheapest;
  }, typeContracts[0]);

  const extraInfo = full
    ? {
        name: cheapest.name,
        company: cheapest.company,
      }
    : {};

  return {
    ...extraInfo,
    centsPerKiwattHour: cheapest.centsPerKiwattHour,
    euroPerMonth: cheapest.euroPerMonth,
    pricingModel,
  };
};
