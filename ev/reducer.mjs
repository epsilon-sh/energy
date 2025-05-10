const DEFAULT_FULL = false; // include contract company and name

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

export const extractContracts = (explicitContracts) => {
  if (!Array.isArray(explicitContracts)) {
    console.error(
      "Expected array of contracts, got:",
      typeof explicitContracts,
    );
    return [];
  }

  return explicitContracts
    .filter((anyContract) =>
      ["FixedPrice", "Spot"].includes(anyContract.Details.PricingModel),
    )
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

  // Assuming average monthly consumption of 1000 kWh for comparison
  const MONTHLY_KWH = 1000;

  const typeContracts = contracts.filter(
    (contract) => contract.pricingModel === pricingModel,
  );

  if (typeContracts.length === 0) {
    return null;
  }

  const cheapest = typeContracts.reduce((cheapest, current) => {
    // Convert all costs to cents for comparison
    const currentTotalCost =
      current.centsPerKiwattHour * MONTHLY_KWH + current.euroPerMonth * 100;
    const cheapestTotalCost =
      cheapest.centsPerKiwattHour * MONTHLY_KWH + cheapest.euroPerMonth * 100;

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
