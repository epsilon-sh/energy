import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Duration } from './types/duration';
import { PricePoint, ConsumptionPoint } from './apiSlice';

interface EnergyChartProps {
  prices: {
    data?: PricePoint[];
    isLoading: boolean;
    error?: string;
  };
  consumption: {
    data?: ConsumptionPoint[];
    isLoading: boolean;
    error?: string;
  };
  resolution: Duration;
}

const LoadingComponent = <div>Loading...</div>;
const ErrorComponent = (error: string) => (
  <>
    <h4>Error:</h4>
    <pre>{JSON.stringify(error, null, 2)}</pre>
  </>
);

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
        <p className="label">{`Time: ${label}`}</p>
        <p className="intro">{`Price: ${payload[0].value}`}</p>
        <p className="intro">{`Consumption: ${payload[1].value}`}</p>
      </div>
    );
  }
  return null;
};

const EnergyChart: React.FC<EnergyChartProps> = ({ prices, consumption, resolution }) => {
  const chartData = prices.data?.map((priceItem, index) => ({
    timeStart: priceItem.time,
    timeEnd: index < (prices.data?.length || 0) - 1 ? prices.data?.[index + 1].time : '',
    price: priceItem.price,
    consumption: parseFloat(consumption.data?.[index]?.quantity || '0'),
  }));

  return (
    <div style={{ position: 'relative' }}>
      {(prices.isLoading || consumption.isLoading) && LoadingComponent}
      {(prices.error || consumption.error) && ErrorComponent(prices.error || consumption.error || 'Unknown error')}
      {(prices.data || consumption.data) && (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timeStart"
              interval={resolution === 'P1D' ? 23 : resolution === 'PT1H' ? 0 : 59}
            />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#ffa500" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="right"
              dataKey="consumption"
              fill="#ffa500"
              fillOpacity={0.8}
              name="Consumption"
            />
            <Line
              yAxisId="left"
              type="step"
              dataKey="price"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              name="Price"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default EnergyChart;
