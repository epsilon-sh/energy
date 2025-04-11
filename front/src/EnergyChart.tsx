import './priceChart.css';

import React, { useState } from 'react';
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
          const value = p.name?.toLowerCase().includes('incurred')
            ? Number(p.value).toFixed(2)
            : p.value
          return (
            <p key={index} style={{ color: p.color }}>
              {`${p.name}: ${value}`}
            </p>
          )
        })}
      </div>
    )
  }
  return null
}

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
    spotCost: elements.spotCost?.data?.[index]?.cost.toFixed(2) || 0,
    spotTotal: elements.spotTotal?.data?.[index]?.total.toFixed(2) || 0,
    fixedCost: elements.fixedCost?.data?.[index]?.cost.toFixed(2) || 0,
    fixedTotal: elements.fixedTotal?.data?.[index]?.total.toFixed(2) || 0,
  }));

  const [renderList, setRenderList] = useState({
    consumption: true,
    price: true,
    spotCost: true,
    spotTotal: true,
    fixedCost: true,
    fixedTotal: true,
  })

  const timeInterval = chartData && chartData.length > 0
    ? getTimeInterval(chartData[0].timeStart, chartData[chartData.length - 1].timeStart)
    : { interval: 12, format: (date: Date) => date.toLocaleString() };

  const formatXAxis = (timestamp: string) => {
    return timeInterval.format(new Date(timestamp));
  };

  const lastSpotTotal = Number(chartData?.[chartData?.length - 1]?.spotTotal || 0)
  const lastFixedTotal = Number(chartData?.[chartData?.length - 1]?.fixedTotal || 0)
  const maxTotal = Math.max(lastSpotTotal, lastFixedTotal, 1)

  return (
    <div className='relative overflow-hidden'>
      {elements.price?.isLoading && LoadingComponent}
      {elements.price?.error && ErrorComponent(elements.price?.error)}
      {elements.price?.data && (
        <>
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
              <YAxis
                yAxisId="costs"
                orientation="right"
                stroke="#666666"
                domain={[1, maxTotal]}
                offset={80}
                hide={true}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {Object.values(elements).map(({ element: Element, name, yAxisId, dataKey, color, props }) => (
                renderList[dataKey as keyof typeof renderList] && (
                  <Element
                    key={name}
                    dataKey={dataKey}
                    name={name}
                    stroke={color}
                    fill={color}
                    yAxisId={yAxisId}
                    {...props}
                  />
                )
              ))}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {Object.entries(renderList).map(([dataKey, isVisible]) => (
              <label key={dataKey} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => setRenderList(prev => ({ ...prev, [dataKey]: !prev[dataKey as keyof typeof prev] }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {dataKey.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default EnergyChart;
