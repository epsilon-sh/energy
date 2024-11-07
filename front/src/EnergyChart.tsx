import './priceChart.css';

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
  // const [prevActive, setPrevActive] = useState(active);
  // if (active !== prevActive) {
  //   console.log({label, payload});
  //   setPrevActive(active);
  // }
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{new Date(label).toLocaleString()}</p>
        {payload.map((p, index) => (
          <p key={index}>{`${p.name}: ${p.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const EnergyChart: React.FC<EnergyChartProps> = ({
  prices,
  consumption,
  // resolution
}) => {
  const chartData = prices.data?.map((priceItem, index) => ({
    timeStart: priceItem.time,
    timeEnd: index < (prices.data?.length || 0) - 1 ? prices.data?.[index + 1].time : '',
    price: priceItem.price,
    consumption: parseFloat(consumption.data?.[index]?.quantity || '0'),
  }));

  return (
    <div className='relative overflow-hidden'>
      {(prices.isLoading || consumption.isLoading) && LoadingComponent}
      {(prices.error || consumption.error) && ErrorComponent(prices.error || consumption.error || 'Unknown error')}
      {(prices.data || consumption.data) && (
        <ResponsiveContainer height={400}>
          <ComposedChart data={chartData} margin={{ left: -25, right: -25, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timeStart" />
            <YAxis yAxisId="consumption" orientation="left" stroke="#ffa500" />
            <YAxis yAxisId="prices" orientation="right" stroke="#8884d8" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="consumption"
              dataKey="consumption"
              fill="#ffa500"
              fillOpacity={0.8}
              name="Consumption"
            />
            <Line
              yAxisId="prices"
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
