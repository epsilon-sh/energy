import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEnergyData } from './useEnergyData';
import EnergyChart from './EnergyChart';
import { DurationSelector } from './components/DurationSelector';
import { Duration, periodResolutions } from './types/duration';
import { Area, Bar, Line } from 'recharts';
import { toSeconds, parse as parseDuration } from 'iso8601-duration'
import { startOfWeek, endOfDay, startOfDay } from 'date-fns';
import ContractsForm from './ContractsForm';

const defaults = {
  start: startOfWeek(new Date()).toISOString(),
  end: endOfDay(new Date()).toISOString(),
  resolution: 'PT1H' as Duration,
  meteringPoint: 'TEST_METERINGPOINT'
};

const priceColors = {
  expensive: '#ff6666',
  cheap: '#66a3ff',
}

const placeholderContracts = [
  {
    name: "Placeholder SPOT",
    pricingModel: "Spot",
    centsPerKiwattHour: 0.5,
    euroPerMonth: 5.0,
  },
  {
    name: "Placeholder FIXED",
    pricingModel: "FixedPrice",
    centsPerKiwattHour: 12.65,
    euroPerMonth: 3.54,
  },
];
export type Contract = typeof placeholderContracts[number];

const EnergyDashboard: React.FC = () => {
  const [currentContracts, setCurrentContracts] = React.useState(placeholderContracts);

  const [searchParams, setSearchParams] = useSearchParams();

  const calculatePrice = React.useCallback((contract: Contract, quantity: number, resolution: Duration, spotPriceMwh?: number) => {
    const monthSeconds = toSeconds(parseDuration('P1M'));
    const periodSeconds = toSeconds(parseDuration(resolution));
    const feeRatio = periodSeconds / monthSeconds;

    const periodFee = contract.euroPerMonth * feeRatio;
    const kwhPrice = contract.centsPerKiwattHour / 100
      + (contract.pricingModel === 'Spot' ? (spotPriceMwh ?? 0) / 1000 : 0);

    return periodFee + quantity * kwhPrice;
  }, []);

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

  const spotContract = currentContracts.find(c => c.pricingModel === 'Spot') as Contract;
  const fixedContract = currentContracts.find(c => c.pricingModel === 'FixedPrice') as Contract;

  const spotIncurred = consumption?.data?.reduce((acc, { quantity, resolution }, idx) => {
    const periodCost = calculatePrice(
      spotContract,
      +quantity,
      resolution as Duration,
      prices.data?.[idx]?.price,
    );
    const total = acc.at(-1)?.total ?? 0;
    acc.push({ cost: periodCost, total: total + periodCost });
    return acc;
  }, [] as { cost: number, total: number }[]) || [];

  const fixedIncurred = consumption.data?.reduce((acc, { quantity, resolution }) => {
    const periodCost = calculatePrice(
      fixedContract,
      +quantity,
      resolution as Duration
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
      : fallback || 'Something went oops';
  };

  const spotTotal = spotIncurred.at(-1)?.total ?? 0;
  const fixedTotal = fixedIncurred.at(-1)?.total ?? 0;

  const spotColor = spotTotal > fixedTotal
    ? priceColors.expensive
    : priceColors.cheap;

  const fixedColor = fixedTotal > spotTotal
    ? priceColors.expensive
    : priceColors.cheap;

  const chartElements = {
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
        <div className='flex-col'>
          <table className='my-s mx-s'>
            <caption className='title'>Period</caption>
            <tbody className='my-s'>
              <tr>
                <th className='pt-s'>TIME</th>
              </tr>
              <tr className='my-s mx-s'>
                <td className='my-s'>Start:</td>
                <td>
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
                </td>
              </tr>


              <tr className='my-s mx-s'>
                <td className='my-s'>End:</td>
                <td>
                  <input type='datetime-local'
                    id='end'
                    value={dateToLocalInputString(endDate)}
                    onChange={e => {
                      const date = startOfDay(new Date(e.target.value));
                      handleEndChange(date);
                    }}
                    step="86400" // 24 hours in seconds
                  />
                </td>
              </tr>

              <tr>
                <th className='pt-s'>Resolution</th>
              </tr><tr>
                <td colSpan={2}>
                  <DurationSelector
                    options={periodResolutions['P7D']}
                    selected={query.resolution}
                    onChange={handleResolutionChange}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ContractsForm
          contracts={currentContracts}
          onUpdateContracts={setCurrentContracts}
        />
      </div>

      <EnergyChart
        resolution={query.resolution}
        elements={chartElements}
      />
    </>
  );
};

export default EnergyDashboard;
