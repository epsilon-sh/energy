export type ContractPricingModel = 'Spot' | 'FixedPrice';

export interface Contract {
  name: string;
  pricingModel: ContractPricingModel;
  centsPerKiwattHour: number; // price
  euroPerMonth: number; // monthly fee
}
