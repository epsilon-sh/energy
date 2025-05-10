const DEFAULT_FULL = true;

/**
 * Extracts price information from contract components
 * @param {Array} explicitPriceComponents - Array of price components from contract
 * @returns {Object} Object containing calculated cents per kWh and euros per month
 * @throws {Error} If price components are invalid or missing required fields
 */
const extractPriceInfo = (explicitPriceComponents) => {
  if (!Array.isArray(explicitPriceComponents)) {
    throw new Error("Price components must be an array");
  }

  let centsPerKiwattHour = 0.0;
  let euroPerMonth = 0.0;

  explicitPriceComponents.forEach((component) => {
    if (!component?.OriginalPayment?.Price || !component.PriceComponentType) {
      throw new Error("Invalid price component structure");
    }

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

  return { centsPerKiwattHour, euroPerMonth };
};

/**
 * Validates and normalizes consumption limits
 * @param {Object} filters - Filters object containing consumption limits
 * @param {string|number} [filters.limitMinKWhPerY] - Minimum kWh per year
 * @param {string|number} [filters.limitMaxKWhPerY] - Maximum kWh per year
 * @returns {Object|null} Normalized min and max values, or null if invalid
 */
const validateConsumptionLimits = (filters) => {
  const DEFAULT_MIN = 0;

  let min =
    filters.limitMinKWhPerY === undefined
      ? DEFAULT_MIN
      : parseFloat(filters.limitMinKWhPerY);

  let max =
    filters.limitMaxKWhPerY === "null" || filters.limitMaxKWhPerY === undefined
      ? Infinity
      : parseFloat(filters.limitMaxKWhPerY);

  if (isNaN(min) || isNaN(max)) {
    return null;
  }

  min = Math.max(0, min);
  max = max < min ? min : max;

  return { min, max };
};

/**
 * Gets the cheapest contract matching the specified criteria
 * @param {Array} allContracts - Array of all available contracts
 * @param {string} pricingModel - Type of pricing model ("Spot" or "FixedPrice")
 * @param {Object} filters - Filters to apply
 * @param {string} [filters.targetGroup] - Target consumer group
 * @param {boolean} [full=true] - Whether to include full contract details
 * @returns {Object|null} The cheapest matching contract or null if none found
 * @throws {Error} If input parameters are invalid
 */
export const getCheapest = (
  allContracts,
  pricingModel,
  filters = {},
  full = DEFAULT_FULL,
) => {
  if (!allContracts?.length || !pricingModel) {
    return null;
  }

  const consumptionLimits = validateConsumptionLimits(filters);
  if (!consumptionLimits) {
    return null;
  }

  const matchingContracts = allContracts.filter((contract) => {
    if (
      !contract?.Details?.PricingModel ||
      !contract?.Details?.ConsumptionLimitation
    ) {
      return false;
    }

    if (
      pricingModel.toLowerCase() !== contract.Details.PricingModel.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.targetGroup &&
      filters.targetGroup !== "Both" &&
      filters.targetGroup !== contract.Details.TargetGroup
    ) {
      return false;
    }

    const contractMin = contract.Details.ConsumptionLimitation.MinXKWhPerY || 0;
    const contractMax =
      contract.Details.ConsumptionLimitation.MaxXKWhPerY || Infinity;

    return !(
      consumptionLimits.max < contractMin || consumptionLimits.min > contractMax
    );
  });

  if (!matchingContracts.length) {
    return null;
  }

  const YEARLY_KWH = 1000 * 12;

  const cheapest = matchingContracts.reduce((cheapest, current) => {
    try {
      const currentPrices = extractPriceInfo(
        current.Details.Pricing.PriceComponents,
      );
      const cheapestPrices = extractPriceInfo(
        cheapest.Details.Pricing.PriceComponents,
      );

      const currentTotalCost =
        currentPrices.centsPerKiwattHour * YEARLY_KWH +
        currentPrices.euroPerMonth * 100 * 12;

      const cheapestTotalCost =
        cheapestPrices.centsPerKiwattHour * YEARLY_KWH +
        cheapestPrices.euroPerMonth * 100 * 12;

      return currentTotalCost < cheapestTotalCost ? current : cheapest;
    } catch (error) {
      return cheapest;
    }
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
