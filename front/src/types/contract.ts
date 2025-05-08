export type ContractKind = 'spot' | 'fixed';

export interface Contract {
  name: string;
  kind: 'fixed' | 'spot';
  centsPerKiwattHour: number; // price
  euroPerMonth: number; // monthly fee
}
