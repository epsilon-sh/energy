import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEnergyData } from './useEnergyData';
import EnergyChart from './EnergyChart';
import { DurationSelector } from './components/DurationSelector';
// import { DateTimeInput } from './components/DateTimeInput'
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
      console.log(prev.set('start', date.toISOString()), `startChange: ${date.toISOString()}`);
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
    <>
      {/* <h1 className='my-s'>Energy Dashboard</h1> */}

      <div className='my-m flex inputs-group'>

        <div className='my-s mx-s'>
          <h3 className='my-s'>Start Time:</h3>
          <input type='datetime-local'
            id='start'
            step={query.resolution}
            value={new Date(query.start).toISOString().slice(0, -1)}
            onChange={e => {
              const value = e.target.value!;
              handleStartChange(new Date(value));
            }}
          />
        </div>

        <div className='my-s mx-s'>
          <h3 className='my-s'>Period:</h3>
          <DurationSelector
            options={[
              'P1Y',
              // 'P3M',
              'P1M',
              'P7D',
              'P1D',
              // 'PT1H',
            ]}
            selected={query.period}
            onChange={handlePeriodChange}
          />
        </div>

        <div className='my-s mx-s'>
          <h3 className='my-s'>Resolution:</h3>
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

    </>
  );
};

export default EnergyDashboard;
