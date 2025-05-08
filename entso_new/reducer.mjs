const extractPriceInfo = (explicitPriceComponents) => {
  let centsPerKiwattHour = 0.0;
  let euroPerMonth = 0.0;

  for (xpc in explicitPriceComponents) {
    switch (xpc.PriceComponentType) {
      case "Monthly":
        euroPerMonth += xpc.OriginalPayment.Price;
        break;
      case "General":
        centsPerKiwattHour += xpc.OriginalPayment.Price;
        break;
      case "DayTime":
      case "NightTime":
        // only true, if day and night are 50/50
        centsPerKiwattHour += xpc.OriginalPayment.Price / 2.0;
        break;
    }
  }

  return {
    centsPerKiwattHour,
    euroPerMonth,
  };
};

export const extractContracts = (explicitContracts) =>
  explicitContracts
    .filter((anyContract) =>
      ["FixedPrice", "Spot"].includes(anyContract.pricingModel),
    )
    .map((ec) => {
      const { centsPerKiwattHour, euroPerMonth } = extractPriceInfo(
        ec.Details.Pricing.PriceComponents,
      );

      return {
        id: ec.Id,
        name: ec.Name,
        company: ec.Company.Name,
        pricingModel: ec.PricingModel,
        centsPerKiwattHour,
        euroPerMonth,
      };
    });
