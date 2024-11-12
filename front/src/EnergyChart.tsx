import './priceChart.css';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { Duration } from './types/duration';
import { ChartElement } from './types/chart';

interface EnergyChartProps {
  resolution: Duration;
  elements: Record<string, ChartElement>;
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
      <div className="custom-tooltip">
        <p className="label">{new Date(label).toLocaleString()}</p>
        {payload.map((p, index) => {
          const value = p.name.toLowerCase().includes('incurred') 
            ? Number(p.value).toFixed(2)
            : p.value;
          return <p key={index}>{`${p.name}: ${value}`}</p>;
        })}
      </div>
    );
  }
  return null;
};

const getTimeInterval = (startTime: string, endTime: string): {
  interval: number;
  format: (date: Date) => string;
} => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const rangeDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const dataPoints = rangeDays * 24; // Assuming hourly data

  // Adjust intervals based on data density
  if (rangeDays <= 1) {
    return {
      interval: Math.ceil(dataPoints / 6), // Show ~6 points per day
      format: (date: Date) => date.toLocaleTimeString('default', { 
        hour: '2-digit',
        hour12: false 
      })
    };
  } else if (rangeDays <= 7) {
    return {
      interval: Math.ceil(dataPoints / 14), // Show ~2 points per day
      format: (date: Date) => {
        const dateStr = date.toLocaleDateString('default', { 
          month: 'numeric', 
          day: 'numeric' 
        });
        const timeStr = date.toLocaleTimeString('default', { 
          hour: '2-digit',
          hour12: false 
        });
        return `${dateStr} ${timeStr}`;
      }
    };
  } else {
    return {
      interval: Math.ceil(dataPoints / (rangeDays / 2)), // Show point every other day
      format: (date: Date) => date.toLocaleDateString('default', { 
        month: 'numeric', 
        day: 'numeric' 
      })
    };
  }
};

const EnergyChart: React.FC<EnergyChartProps> = ({ elements }) => {
  const chartData = elements.price?.data?.map((priceItem, index) => ({
    timeStart: priceItem.time,
    timeEnd: index < (elements.price?.data?.length || 0) - 1 ? elements.price?.data?.[index + 1].time : '',
    price: priceItem.price,
    consumption: parseFloat(elements.consumption?.data?.[index]?.quantity || '0'),
    spotCost: elements.spotContract?.data?.[index]?.cost || 0,
    fixedCost: elements.fixedContract?.data?.[index]?.cost || 0,
  }));

  const timeInterval = chartData && chartData.length > 0
    ? getTimeInterval(chartData[0].timeStart, chartData[chartData.length - 1].timeStart)
    : { interval: 12, format: (date: Date) => date.toLocaleString() };

  const formatXAxis = (timestamp: string) => {
    return timeInterval.format(new Date(timestamp));
  };

  return (
    <div className='relative overflow-hidden'>
      {elements.price?.isLoading && LoadingComponent}
      {elements.price?.error && ErrorComponent(elements.price?.error)}
      {elements.price?.data && (
        <ResponsiveContainer height={400}>
          <ComposedChart data={chartData} margin={{ left: -25, right: -25, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timeStart" 
              tickFormatter={formatXAxis}
              interval={timeInterval.interval}
              minTickGap={40}
            />
            <YAxis yAxisId="consumption" orientation="left" stroke="#ffa500" />
            <YAxis yAxisId="prices" orientation="right" stroke="#8884d8" />
            <YAxis yAxisId="cost" orientation="right" stroke="#8884d8" hide />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {Object.values(elements).map(({ element: Element, name, yAxisId, dataKey, color, props }) => (
              <Element
                key={name}
                dataKey={dataKey}
                name={name}
                stroke={color}
                fill={color}
                yAxisId={yAxisId || 'consumption'}
                {...props}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default EnergyChart;
