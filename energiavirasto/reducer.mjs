const DEFAULT_FULL = true;

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
      case "SeasonalWinterDay":
        centsPerKiwattHour += 0.25 * component.OriginalPayment.Price;
        break;
      case "SeasonalOther":
        centsPerKiwattHour += 0.75 * component.OriginalPayment.Price;
        break;
      case "DayTime":
      case "NightTime":
        centsPerKiwattHour += component.OriginalPayment.Price / 2.0;
        break;
    }
  });

  return {
    centsPerKiwattHour,
    euroPerMonth,
  };
};

/**
 * Validates and normalizes consumption limits
 * @param {Object} filters - The filters object containing consumption limits
 * @returns {Object} Normalized min and max values, or null if invalid
 */
const validateConsumptionLimits = (filters) => {
  const DEFAULT_MIN = 0;
  const MAX_POSSIBLE = 1000000; // 1 million kWh per year as sanity check

  let min =
    filters.limitMinKWhPerY === undefined
      ? DEFAULT_MIN
      : parseFloat(filters.limitMinKWhPerY);

  let max =
    filters.limitMaxKWhPerY === "null"
      ? MAX_POSSIBLE
      : parseFloat(filters.limitMaxKWhPerY);

  // Validate numbers
  if (isNaN(min) || isNaN(max)) {
    return null;
  }

  // Ensure min is not negative
  min = Math.max(0, min);

  // Ensure max is not below min
  if (max < min) {
    max = min;
  }

  // Sanity check on max
  max = Math.min(max, MAX_POSSIBLE);

  return { min, max };
};

/**
 * Gets the cheapest contract of given pricingModel from the list, applying filters
 * @param {Array} allContracts - Array of all contracts
 * @param {string} pricingModel - Type of pricing model to filter for ("Spot" or "FixedPrice")
 * @param {Object} filters - Filters to apply (targetGroup, consumption limits, etc.)
 * @param {boolean} full - Whether to include contract name and company in result
 * @returns {Object|null} The cheapest matching contract, or null if none found
 */
export const getCheapest = (
  allContracts,
  pricingModel,
  filters = {},
  full = DEFAULT_FULL,
) => {
  if (
    !allContracts ||
    !Array.isArray(allContracts) ||
    allContracts.length === 0
  ) {
    return null;
  }

  const consumptionLimits = validateConsumptionLimits(filters);
  if (!consumptionLimits) {
    return null;
  }

  const matchingContracts = allContracts.filter((c) => {
    // Pricing model check (case-insensitive)
    if (pricingModel.toLowerCase() !== c.Details.PricingModel.toLowerCase())
      return false;

    // Target group check
    if (
      filters.targetGroup &&
      filters.targetGroup !== "Both" &&
      filters.targetGroup !== c.Details.TargetGroup
    )
      return false;

    // Consumption limitation checks
    const contractMin = c.Details.ConsumptionLimitation.MinXKWhPerY || 0;
    const contractMax = c.Details.ConsumptionLimitation.MaxXKWhPerY || Infinity;

    // Check if the user's consumption range overlaps with the contract's allowed range
    if (
      consumptionLimits.max < contractMin ||
      consumptionLimits.min > contractMax
    ) {
      return false;
    }

    return true;
  });

  if (matchingContracts.length === 0) {
    return null;
  }

  const YEARLY_KWH = 1000 * 12;

  const cheapest = matchingContracts.reduce((cheapest, current) => {
    const { centsPerKiwattHour: currentKwh, euroPerMonth: currentMonthly } =
      extractPriceInfo(current.Details.Pricing.PriceComponents);
    const { centsPerKiwattHour: cheapestKwh, euroPerMonth: cheapestMonthly } =
      extractPriceInfo(cheapest.Details.Pricing.PriceComponents);

    const currentTotalCost =
      currentKwh * YEARLY_KWH + currentMonthly * 100 * 12;
    const cheapestTotalCost =
      cheapestKwh * YEARLY_KWH + cheapestMonthly * 100 * 12;

    return currentTotalCost < cheapestTotalCost ? current : cheapest;
  }, matchingContracts[0]);

  const { centsPerKiwattHour, euroPerMonth } = extractPriceInfo(
    cheapest.Details.Pricing.PriceComponents,
  );

  return {
    ...(full
      ? {
          id: cheapest.Id,
          name: cheapest.Name,
          company: cheapest.Company.Name,
        }
      : {}),
    pricingModel: cheapest.Details.PricingModel,
    centsPerKiwattHour,
    euroPerMonth,
  };
};

export { extractPriceInfo };
