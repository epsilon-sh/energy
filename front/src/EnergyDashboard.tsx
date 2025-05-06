import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEnergyData } from './useEnergyData';
import EnergyChart from './EnergyChart';
import { DurationSelector } from './components/DurationSelector';
import { Duration, periodResolutions } from './types/duration';
import { Area, Bar, Line } from 'recharts';
import { ChartElement } from './types/chart';
import { toSeconds, parse as parseDuration } from 'iso8601-duration'
import { startOfWeek, endOfDay } from 'date-fns';

const defaults = {
  start: startOfWeek(new Date()).toISOString(),
  end: endOfDay(new Date()).toISOString(),
  resolution: 'PT1H' as Duration,
  meteringPoint: 'TEST_METERINGPOINT'
};

const defaultValues = {
  spot_price: 0.5,
  spot_fee: 5.0,
  fixed_price: 12.65,
  fixed_fee: 3.54,
};

const getStoredValue = (key: string) => {
  const stored = localStorage.getItem(key);
  return stored ? parseFloat(stored) : defaultValues[key as keyof typeof defaultValues];
};

const placeholderContracts = [
  {
    contractName: 'Placeholder SPOT',
    contractType: 'spot',
    centsPerKiwattHour: getStoredValue('spot_price'),
    euroPerMonth: getStoredValue('spot_fee'),
  },
  {
    contractName: 'Placeholder FIXED',
    contractType: 'fixed',
    centsPerKiwattHour: getStoredValue('fixed_price'),
    euroPerMonth: getStoredValue('fixed_fee'),
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
  if (query.end < query.start) {
    const startDate = new Date(query.start)
    const endDate = new Date(query.start)
    endDate.setHours(startDate.getHours() + 24)

    query.end = endDate.toISOString()
    searchParams.set('end', query.end)
  }

  const { prices, consumption } = useEnergyData(query);

  const spotIncurred = consumption?.data?.reduce((acc, { quantity, resolution }, idx) => {
    const periodCost = spotPricer(
      +quantity,
      resolution as Duration,
      prices.data?.[idx]?.price,
    );
    const total = acc.at(-1)?.total ?? 0;
    acc.push({ cost: periodCost, total: total + periodCost });
    return acc;
  }, [] as { cost: number, total: number }[]) || [];

  const fixedIncurred = consumption.data?.reduce((acc, { quantity, resolution }) => {
    const periodCost = fixedPricer(
      +quantity,
      resolution as Duration,
    );
    const total = acc.at(-1)?.total ?? 0;
    acc.push({ cost: periodCost, total: total + periodCost });
    return acc;
  }, [] as { cost: number, total: number }[]) || [];

  const handleStartChange = (date: Date) => {
    console.log('handleStartCHange', date)
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

  const getErrorMessage = (error: unknown, fallback = '') => {
    if (!error) return undefined;
    return 'message' in (error as Error)
      ? (error as Error).message
      // : String(error);
      : fallback || 'Something went oops';
  };

  const spotColor = spotIncurred.at(-1)?.total > fixedIncurred?.at(-1)?.total
    ? priceColors.expensive
    : priceColors.cheap;

  const fixedColor = fixedIncurred.at(-1)?.total > spotIncurred?.at(-1)?.total
    ? priceColors.expensive
    : priceColors.cheap;

  const chartElements: Record<string, ChartElement> = {
    consumption: {
      name: 'Consumption',
      element: Bar,
      data: consumption.data,
      isLoading: consumption.isLoading,
      error: getErrorMessage(consumption.error, 'Error getting consumption data.'),
      dataKey: 'consumption',
      yAxisId: 'consumption',
      color: '#ffa500',
    },
    price: {
      name: 'Price',
      element: Line,
      data: prices.data,
      isLoading: prices.isLoading,
      error: getErrorMessage(prices.error, 'Error getting prices data.'),
      dataKey: 'price',
      yAxisId: 'prices',
      color: '#8884d8',
      props: {
        dot: false,
        type: "step",
        strokeWidth: 1.5,
      }
    },
    fixedTotal: {
      name: 'Total (fixed)',
      element: Area,
      data: fixedIncurred,
      isLoading: consumption.isLoading || prices.isLoading,
      error: getErrorMessage(consumption.error || prices.error, 'Couldn\'t compute fixed cost.'),
      dataKey: 'fixedTotal',
      yAxisId: 'costs',
      color: fixedColor,
      props: {
        dot: false,
        strokeWidth: 1.5,
        fillOpacity: 0.2,
      }
    },
    fixedCost: {
      name: 'Cost (fixed)',
      element: Bar,
      data: fixedIncurred,
      isLoading: consumption.isLoading || prices.isLoading,
      error: getErrorMessage(consumption.error || prices.error, 'Couldn\'t compute fixed cost.'),
      dataKey: 'fixedCost',
      yAxisId: 'costs',
      color: fixedColor,
      props: {
        dot: false,
        strokeWidth: 1.5,
        fillOpacity: 0.2,
      }
    },
    spotTotal: {
      name: 'Total (spot)',
      element: Area,
      data: spotIncurred,
      isLoading: consumption.isLoading || prices.isLoading,
      error: getErrorMessage(consumption.error || prices.error, 'Couldn\'t compute spot cost.'),
      dataKey: 'spotTotal',
      yAxisId: 'costs',
      color: spotColor,
      props: {
        dot: false,
        strokeWidth: 1.5,
        fillOpacity: 0.2,
      }
    },
    spotCost: {
      name: 'Cost (spot)',
      element: Bar,
      data: spotIncurred,
      isLoading: consumption.isLoading || prices.isLoading,
      error: getErrorMessage(consumption.error || prices.error, 'Couldn\'t compute spot cost.'),
      dataKey: 'spotCost',
      yAxisId: 'costs',
      color: spotColor,
      props: {
        dot: false,
        strokeWidth: 1.5,
        fillOpacity: 0.2,
      }
    },
  };

  const startDate = new Date(query.start)
  const endDate = new Date(query.end)

  const dateToLocalInputString = (date: Date) => {
    const YYYY = date.getFullYear()
    const MM = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');

    return `${YYYY}-${MM}-${dd}T${hh}:${mm}`;
  }

  return (
    <>

      <div className='my-m flex inputs-group'>
        <div className='flex-column'>
          <div className='my-s mx-s'>
            <h3 className='my-s'>Start Time:</h3>
            <input type='datetime-local'
              id='start'
              value={dateToLocalInputString(startDate)}
              onChange={e => {
                const elemDate = e.target.value
                console.log('date elem change', elemDate)
                const date = new Date(e.target.value);
                console.log('parsed jsdate', date)
                console.log('local isodate', date.toISOString())
                handleStartChange(date);
              }}
              step="86400" // 24 hours in seconds
            />
          </div>

          <div className='my-s mx-s'>
            <h3 className='my-s'>End Time:</h3>
            <input type='datetime-local'
              id='end'
              value={dateToLocalInputString(endDate)}
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

        <form className='flex-column' onSubmit={e => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);

          localStorage.setItem('spot_price', formData.get('spot_price') as string);
          localStorage.setItem('spot_fee', formData.get('spot_fee') as string);
          localStorage.setItem('fixed_price', formData.get('fixed_price') as string);
          localStorage.setItem('fixed_fee', formData.get('fixed_fee') as string);

          window.location.reload();
        }}>
          <table className='my-s mx-s'>
            <caption className='my-s'>Contract Settings</caption>
            <tbody className='my-s'>
              <tr>
                <th>Spot Contract</th>
              </tr>
              <tr>
                <td>
                  <label htmlFor='spot-price'>Price (c/kWh):</label>
                </td>
                <td>
                  <input
                    type='number'
                    id='spot-price'
                    name='spot_price'
                    step='0.01'
                    min='0'
                    defaultValue={getStoredValue('spot_price')}
                    className='mx-s'
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor='spot-fee'>Monthly Fee (€):</label>
                </td>
                <td>
                  <input
                    type='number'
                    id='spot-fee'
                    name='spot_fee'
                    step='0.01'
                    min='0'
                    defaultValue={getStoredValue('spot_fee')}
                    className='mx-s'
                  />
                </td>
              </tr>
            </tbody>

            <tbody className='my-s'>
              <tr>
                <th>Fixed Contract</th>
              </tr>

              <tr>
                <td>
                  <label htmlFor='fixed-price'>Price (c/kWh):</label>
                </td>
                <td>
                  <input
                    type='number'
                    id='fixed-price'
                    name='fixed_price'
                    step='0.01'
                    min='0'
                    defaultValue={getStoredValue('fixed_price')}
                    className='mx-s'
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor='fixed-fee'>Monthly Fee (€):</label>
                </td>
                <td>
                  <input
                    type='number'
                    id='fixed-fee'
                    name='fixed_fee'
                    step='0.01'
                    min='0'
                    defaultValue={getStoredValue('fixed_fee')}
                    className='mx-s'
                  />
                </td>
              </tr>
            </tbody>

            <tfoot className='my-s'>
              <tr>
                <th>
                  <button type='button' onClick={() => {
                    Object.keys(defaultValues).forEach(key => localStorage.removeItem(key));
                    window.location.reload();
                  }} className='mx-s'>Reset to Defaults</button>
                </th>
                <th>
                  <button type='submit' className='mx-s'>Apply Changes</button>
                </th>
              </tr>
            </tfoot>
          </table>
        </form>
      </div>

      <EnergyChart
        resolution={query.resolution}
        elements={chartElements}
      />

    </>
  );
};

export default EnergyDashboard;
