import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEnergyData } from './useEnergyData';
import EnergyChart from './EnergyChart';
import { DurationSelector } from './components/DurationSelector';
import { Duration, periodResolutions } from './types/duration';

const defaults = {
  start: new Date('2023-01-01').toISOString(),
  period: 'P1Y' as Duration,
  resolution: 'P1D' as Duration,
};

const EnergyDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = {
    start: searchParams.get('start') || defaults.start,
    period: (searchParams.get('period') as Duration) || defaults.period,
    resolution: (searchParams.get('resolution') as Duration) || defaults.resolution,
  };

  const { prices, consumption } = useEnergyData(query);

  const handlePeriodChange = (period: Duration) => {
    const availableResolutions = periodResolutions[period];
    const newResolution = availableResolutions.includes(query.resolution)
      ? query.resolution
      : availableResolutions[availableResolutions.length - 1];

    setSearchParams(prev => {
      prev.set('period', period);
      prev.set('resolution', newResolution);
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

  return (
    <div>
      <h1>Energy Dashboard</h1>

      <h3>Period:</h3>
      <DurationSelector
        options={['P1Y', 'P3M', 'P1M', 'P7D', 'P1D', 'PT1H']}
        selected={query.period}
        onChange={handlePeriodChange}
      />

      <h3>Resolution:</h3>
      <DurationSelector
        options={periodResolutions[query.period]}
        selected={query.resolution}
        onChange={handleResolutionChange}
      />

      <EnergyChart
        prices={{
          data: prices.data,
          isLoading: prices.isLoading,
          error: getErrorMessage(prices.error)
        }}
        consumption={{
          data: consumption.data,
          isLoading: consumption.isLoading,
          error: getErrorMessage(consumption.error)
        }}
        resolution={query.resolution}
      />
    </div>
  );
};

export default EnergyDashboard;
