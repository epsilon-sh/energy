import { Contract } from "../front/src/types/Contracts";

export const contracts: Contract[] = [
  {
    name: "SPOT",
    pricingModel: "Spot",
    centsPerKiwattHour: 0.5,
    euroPerMonth: 5.0,
  },
  {
    name: "FIXED",
    pricingModel: "FixedPrice",
    centsPerKiwattHour: 12.65,
    euroPerMonth: 3.54,
  },
];
