import type { Area, Bar, Line } from 'recharts';

export interface ConsumptionPoint {
  quantity: string;
  resolution: string;
  time?: string;
}

export interface PricePoint {
  time: string;
  price: number;
}

export interface CostPoint {
  cost: number;
  total: number;
}

type ChartDataPoint = ConsumptionPoint | PricePoint | CostPoint;

interface BaseChartElement {
  name: string;
  data?: ChartDataPoint[];
  color?: string;
  yAxisId?: string;
  dataKey?: string;
  isLoading?: boolean;
  error?: string;
}

interface BarChartElement extends BaseChartElement {
  element: typeof Bar;
  props?: {
    dot?: boolean;
    strokeWidth?: number;
    fillOpacity?: number;
  };
}

interface LineChartElement extends BaseChartElement {
  element: typeof Line;
  props?: {
    dot?: boolean;
    type?: 'step';
    strokeWidth?: number;
  };
}

interface AreaChartElement extends BaseChartElement {
  element: typeof Area;
  props?: {
    dot?: boolean;
    strokeWidth?: number;
    fillOpacity?: number;
  };
}

export type ChartElement = BarChartElement | LineChartElement | AreaChartElement;