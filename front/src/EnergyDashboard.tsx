import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEnergyData } from './useEnergyData';
import EnergyChart from './EnergyChart';
import { DurationSelector } from './components/DurationSelector';
// import { DateTimeInput } from './components/DateTimeInput'
import { Duration, periodResolutions } from './types/duration';
import { parse as parseDuration } from 'iso8601-duration';
import { add, sub } from 'date-fns'

const defaults = {
  start: new Date('2023-01-01T00:00:00Z').toISOString(),
  end: new Date('2023-01-08T00:00:00Z').toISOString(),
  resolution: 'PT1H' as Duration,
  meteringPoint: 'TEST_METERINGPOINT'
};

const EnergyDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = {
    start: searchParams.get('start') || defaults.start,
    end: searchParams.get('end') || defaults.end,
    resolution: (searchParams.get('resolution') as Duration) || defaults.resolution,
    meteringPoint: (searchParams.get('meteringPoint') || searchParams.get('MeteringPointGSRN')) || defaults.meteringPoint,
  };

  console.log({ query }, 'useEnergyData query')
  const { prices, consumption } = useEnergyData(query);

  const handleStartChange = (date: Date) => {
    setSearchParams(prev => {
      console.log(prev.set('start', date.toISOString()), `startChange: ${date.toISOString()}`);
      return prev;
    });
  };

  const handleEndChange = (date: Date) => {
    setSearchParams(prev => {
      console.log(prev.set('end', date.toISOString()), `endChange: ${date.toISOString()}`);
      return prev;
    });
  };

  // const handlePeriodChange = (period: Duration) => {
  //   const availableResolutions = periodResolutions[period];
  //   const newResolution = availableResolutions.includes(query.resolution)
  //     ? query.resolution
  //     : availableResolutions.at(-1);

  //   setSearchParams(prev => {
  //     prev.set('period', period);
  //     prev.set('resolution', newResolution);
  //     return prev;
  //   });
  // };

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
          <h3 className='my-s'>End Time:</h3>
          <input type='datetime-local'
            id='end'
            step='PT1H'
            value={new Date(query.end).toISOString().slice(0, -1)}
            onChange={e => handleEndChange(new Date(e.target.value))}
          />
        </div>

        {/* <div className='my-s mx-s'>
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
        </div> */}

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
