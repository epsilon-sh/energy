import { Bar, Line, Area } from 'recharts';

export type ChartElementComponent = Bar | Line | Area;

export interface ChartData {
    data?: Array<Record<string, unknown>>;
    isLoading: boolean;
    error?: string;
  }

export interface ChartElement {
  name: string;
  element: ChartElementComponent;
  data?: ChartData;
  isLoading: boolean;
  error?: string;
  dataKey: string;
  yAxisId: string;
  color: string;
  props?: Record<string, unknown>;
}