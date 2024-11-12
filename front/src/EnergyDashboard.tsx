import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEnergyData } from './useEnergyData';
import EnergyChart from './EnergyChart';
import { DurationSelector } from './components/DurationSelector';
import { Duration, periodResolutions } from './types/duration';
import { Area, Bar, Line } from 'recharts';
import { ChartElement } from './types/chart';
import { toSeconds, parse as parseDuration } from 'iso8601-duration'

const defaults = {
  start: new Date('2023-01-01T00:00:00Z').toISOString(),
  end: new Date('2023-01-08T00:00:00Z').toISOString(),
  resolution: 'PT1H' as Duration,
  meteringPoint: 'TEST_METERINGPOINT'
};

const placeholderContracts = [
  {
    contractName: 'Placeholder SPOT',
    contractType: 'spot',
    centsPerKiwattHour: 0.5,
    euroPerMonth: 5.0,
  },
  {
    contractName: 'Placeholder FIXED',
    contractType: 'fixed',
    centsPerKiwattHour: 10,
    euroPerMonth: 5.0,
  }
]

const contractPricer = (contract: typeof placeholderContracts[number]) => {
  const monthlyFee = contract.euroPerMonth;
  const monthSeconds = toSeconds(parseDuration('P1M'));

  return (quantity: number, resolution: Duration, spotPriceMwh?: number) => {
    // Convert resolution to seconds and compare with a month's seconds
    const periodSeconds = toSeconds(parseDuration(resolution));
    const feeRatio = periodSeconds / monthSeconds;
    
    const periodFee = monthlyFee * feeRatio;
    const kwhPrice = contract.centsPerKiwattHour / 100
      + (spotPriceMwh ?? 0) / 1000;

    return periodFee + quantity * kwhPrice;
  }
}
const spotPricer = contractPricer(placeholderContracts[0]);
const fixedPricer = contractPricer(placeholderContracts[1]);

const priceColors = {
  expensive: '#ff6666',
  cheap: '#66a3ff',
}

const EnergyDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = {
    start: searchParams.get('start') || defaults.start,
    end: searchParams.get('end') || defaults.end,
    resolution: (searchParams.get('resolution') as Duration) || defaults.resolution,
    meteringPoint: (searchParams.get('meteringPoint') || searchParams.get('MeteringPointGSRN')) || defaults.meteringPoint,
  };

  // console.log({ query }, 'useEnergyData query')
  const { prices, consumption } = useEnergyData(query);
  window.prices = prices.data;
  window.consumption = consumption.data;

  const spotIncurred = consumption.data?.reduce((acc, { quantity, resolution }, idx) => {
    const incurred = acc.at(-1)?.cost ?? 0;
    const periodCost = spotPricer(
      +quantity, 
      resolution as Duration,
      prices.data?.[idx]?.price,
    );
    acc.push({ cost: incurred + periodCost });
    return acc;
  }, [] as { cost: number }[]);

  const fixedIncurred = consumption.data?.reduce((acc, { quantity, resolution }) => {
    const incurred = acc.at(-1)?.cost ?? 0;
    const periodCost = fixedPricer(
      +quantity, 
      resolution as Duration,
    );
    acc.push({ cost: incurred + periodCost });
    return acc;
  }, [] as { cost: number }[]);

  const handleStartChange = (date: Date) => {
    const endDate = new Date(searchParams.get('end') || defaults.end);
    if (date > endDate) {
      console.log('Adjusting end date to be one day after start date');
      endDate.setDate(date.getDate() + 1);
      setSearchParams(prev => {
        prev.set('end', endDate.toISOString());
        return prev;
      });
    }
    setSearchParams(prev => {
      console.log(prev.set('start', date.toISOString()), `startChange: ${date.toISOString()}`);
      return prev;
    });
  };

  const handleEndChange = (date: Date) => {
    const startDate = new Date(searchParams.get('start') || defaults.start);
    if (date < startDate) {
      console.log('Adjusting start date to be one day before end date');
      startDate.setDate(date.getDate() - 1);
      setSearchParams(prev => {
        prev.set('start', startDate.toISOString());
        return prev;
      });
    }
    setSearchParams(prev => {
      console.log(prev.set('end', date.toISOString()), `endChange: ${date.toISOString()}`);
      return prev;
    });
  };

  const handleResolutionChange = (resolution: Duration) => {
    setSearchParams(prev => {
      prev.set('resolution', resolution);
      return prev;
    });
  };

  const getErrorMessage = (error: unknown) => {
    if (!error) return undefined;
    return 'message' in (error as Error)
      ? (error as Error).message
      : String(error);
  };

  const spotColor = spotIncurred?.at(-1)?.cost > fixedIncurred?.at(-1)?.cost
    ? priceColors.expensive
    : priceColors.cheap;

  const fixedColor = fixedIncurred?.at(-1)?.cost > spotIncurred?.at(-1)?.cost
    ? priceColors.expensive
    : priceColors.cheap;

  const chartElements: Record<string, ChartElement> = {
    consumption: {
      name: 'Consumption',
      element: Bar,
      data: consumption.data,
      isLoading: consumption.isLoading,
      error: getErrorMessage(consumption.error),
      dataKey: 'consumption',
      yAxisId: 'consumption',
      color: '#ffa500',
    },
    price: {
      name: 'Price',
      element: Line,
      data: prices.data,
      isLoading: prices.isLoading,
      error: getErrorMessage(prices.error),
      dataKey: 'price',
      yAxisId: 'prices',
      color: '#8884d8',
      props: {
        dot: false,
        type: "step",
        strokeWidth: 1.5,
      }
    },
    spotContract: {
      name: 'Incurred (spot)',
      element: Area,
      data: spotIncurred,
      isLoading: consumption.isLoading || prices.isLoading,
      error: getErrorMessage(consumption.error) || getErrorMessage(prices.error),
      dataKey: 'spotCost',
      color: spotColor,
      props: {
        dot: false,
        // type: 'step',
        strokeWidth: 1.5,
        fillOpacity: 0.2,
      }
    },
    fixedContract: {
      name: 'Incurred (fixed)',
      element: Area,
      data: fixedIncurred,
      isLoading: consumption.isLoading || prices.isLoading,
      error: getErrorMessage(consumption.error) || getErrorMessage(prices.error),
      dataKey: 'fixedCost',
      color: fixedColor,
      props: {
        dot: false,
        // type: 'monotone',
        strokeWidth: 1.5,
        fillOpacity: 0.2,
      }
    },
  };

  return (
    <>

      <div className='my-m flex inputs-group'>

        <div className='my-s mx-s'>
          <h3 className='my-s'>Start Time:</h3>
          <input type='datetime-local'
            id='start'
            value={new Date(query.start).toISOString().slice(0, -1)}
            onChange={e => {
              const date = new Date(e.target.value);
              date.setHours(0, 0, 0, 0); // Round to midnight
              handleStartChange(date);
            }}
            step="86400" // 24 hours in seconds
          />
        </div>

        <div className='my-s mx-s'>
          <h3 className='my-s'>End Time:</h3>
          <input type='datetime-local'
            id='end'
            value={new Date(query.end).toISOString().slice(0, -1)}
            onChange={e => {
              const date = new Date(e.target.value);
              date.setHours(0, 0, 0, 0); // Round to midnight
              handleEndChange(date);
            }}
            step="86400" // 24 hours in seconds
          />
        </div>

        <div className='my-s mx-s block'>
          <h3 className='my-s'>Resolution:</h3>
          <DurationSelector
            options={periodResolutions['P7D']}
            selected={query.resolution}
            onChange={handleResolutionChange}
          />
        </div>

      </div>

      <EnergyChart
        resolution={query.resolution}
        elements={chartElements}
      />

    </>
  );
};

export default EnergyDashboard;
