import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEnergyData } from './useEnergyData';
import EnergyChart from './EnergyChart';
import { DurationSelector } from './components/DurationSelector';
import { DateTimeInput } from './components/DateTimeInput'
import { Duration, periodResolutions } from './types/duration';

const defaults = {
  start: new Date('2023-01-01T00:00:00Z').toISOString(),
  period: 'P1D' as Duration,
  resolution: 'PT1H' as Duration,
};

const EnergyDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = {
    start: searchParams.get('start') || defaults.start,
    period: (searchParams.get('period') as Duration) || defaults.period,
    resolution: (searchParams.get('resolution') as Duration) || defaults.resolution,
  };

  const { prices, consumption } = useEnergyData(query);

  const handleStartChange = (date: Date) => {
    setSearchParams(prev => {
      prev.set('start', date.toISOString());
      return prev;
    });
  };

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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Energy Dashboard</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-2">Start Time:</h3>
          <DateTimeInput
            onChange={handleStartChange}
            defaultValue={new Date(query.start)}
          />
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-2">Period:</h3>
          <DurationSelector
            options={['P1Y', 'P3M', 'P1M', 'P7D', 'P1D', 'PT1H']}
            selected={query.period}
            onChange={handlePeriodChange}
          />
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-2">Resolution:</h3>
          <DurationSelector
            options={periodResolutions[query.period]}
            selected={query.resolution}
            onChange={handleResolutionChange}
          />
        </div>
      </div>

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
