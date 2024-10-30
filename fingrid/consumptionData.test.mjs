import { ConsumptionData } from './consumptionData.mjs';
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

describe('ConsumptionData.groupBy', async () => {
  let data;

  beforeEach(() => {
    data = new ConsumptionData();
  });

  it('should handle simple 15min to 1hour conversion', async () => {
    data.push(
      {
        startTime: '2024-01-01T00:00:00Z',
        quantity: '10',
        unit: 'kWh',
        resolution: 'PT15M',
        meteringPoint: 'MP1',
        productType: 'Energy',
        readingType: 'Usage'
      },
      {
        startTime: '2024-01-01T00:15:00Z',
        quantity: '15',
        unit: 'kWh',
        resolution: 'PT15M',
        meteringPoint: 'MP1',
        productType: 'Energy',
        readingType: 'Usage'
      },
      {
        startTime: '2024-01-01T00:30:00Z',
        quantity: '20',
        unit: 'kWh',
        resolution: 'PT15M',
        meteringPoint: 'MP1',
        productType: 'Energy',
        readingType: 'Usage'
      },
      {
        startTime: '2024-01-01T00:45:00Z',
        quantity: '15',
        unit: 'kWh',
        resolution: 'PT15M',
        meteringPoint: 'MP1',
        productType: 'Energy',
        readingType: 'Usage'
      }
    );

    const result = data.groupBy('PT1H');

    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      startTime: '2024-01-01T00:00:00.000Z',
      quantity: 60,
      unit: 'kWh',
      resolution: 'PT1H',
      meteringPoint: 'MP1',
      productType: 'Energy',
      readingType: 'Usage'
    });
  });

  it('should handle 1hour to 15min conversion', async () => {
    data.push({
      startTime: '2024-01-01T00:00:00Z',
      quantity: '60',
      unit: 'kWh',
      resolution: 'PT1H',
      meteringPoint: 'MP1',
      productType: 'Energy',
      readingType: 'Usage'
    });

    const result = data.groupBy('PT15M');

    assert.equal(result.length, 4);
    result.forEach(measurement => {
      assert.equal(measurement.quantity, 15);
      assert.equal(measurement.unit, 'kWh');
      assert.equal(measurement.resolution, 'PT15M');
      assert.equal(measurement.meteringPoint, 'MP1');
      assert.equal(measurement.productType, 'Energy');
      assert.equal(measurement.readingType, 'Usage');
    });
  });

  it('should handle unit conversions', async () => {
    data.push({
      startTime: '2024-01-01T00:00:00Z',
      quantity: '1',
      unit: 'MWh',
      resolution: 'PT1H',
      meteringPoint: 'MP1',
      productType: 'Energy',
      readingType: 'Usage'
    });

    const result = data.groupBy('PT1H');

    assert.equal(result[0].quantity, 1000);
    assert.equal(result[0].unit, 'kWh');
  });

  it('should handle partial data with extrapolation', async () => {
    data.push(
      {
        startTime: '2024-01-01T00:00:00Z',
        quantity: '10',
        unit: 'kWh',
        resolution: 'PT15M',
        meteringPoint: 'MP1',
        productType: 'Energy',
        readingType: 'Usage'
      },
      {
        startTime: '2024-01-01T00:15:00Z',
        quantity: '15',
        unit: 'kWh',
        resolution: 'PT15M',
        meteringPoint: 'MP1',
        productType: 'Energy',
        readingType: 'Usage'
      },
      {
        startTime: '2024-01-01T00:30:00Z',
        quantity: '20',
        unit: 'kWh',
        resolution: 'PT15M',
        meteringPoint: 'MP1',
        productType: 'Energy',
        readingType: 'Usage'
      }
    );

    const result = data.groupBy('PT1H');

    assert.equal(result[0].quantity, 60);
    assert.equal(result[0].unit, 'kWh');
  });

  it('should keep measurements with different characteristics separate', async () => {
    data.push(
      {
        startTime: '2024-01-01T00:00:00Z',
        quantity: '10',
        unit: 'kWh',
        resolution: 'PT15M',
        meteringPoint: 'MP1',
        productType: 'Energy',
        readingType: 'Usage'
      },
      {
        startTime: '2024-01-01T00:00:00Z',
        quantity: '20',
        unit: 'kWh',
        resolution: 'PT15M',
        meteringPoint: 'MP2',
        productType: 'Energy',
        readingType: 'Usage'
      }
    );

    const result = data.groupBy('PT15M');

    assert.equal(result.length, 2);
    assert.equal(result.find(m => m.meteringPoint === 'MP1').quantity, 10);
    assert.equal(result.find(m => m.meteringPoint === 'MP2').quantity, 20);
  });
});
