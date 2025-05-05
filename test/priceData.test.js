import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { PriceData, comparePricePoints } from '../entso/priceData.mjs'

describe('PriceData', async () => {
  // Helper function to create test price objects
  const createPrice = (time, resolution = 'PT15M', domain = 'FI', price = 100) => ({
    time: new Date(time).toISOString(),
    resolution,
    domain,
    price
  });

  test('insert into empty array', () => {
    const priceData = new PriceData();
    const price = createPrice('2024-01-01T00:00:00Z');
    priceData.insert(price);
    assert.equal(priceData.length, 1);
    assert.deepEqual(priceData[0], price);
  });

  test('maintain sort order when inserting multiple items', () => {
    const priceData = new PriceData();
    const prices = [
      createPrice('2024-01-01T01:00:00Z'),
      createPrice('2024-01-01T02:00:00Z'),
      createPrice('2024-01-01T03:00:00Z'),
    ];
    priceData.insert(...prices);

    const newPrices = [
      createPrice('2024-01-01T00:00:00Z'),
      createPrice('2024-01-01T01:30:00Z'),
      createPrice('2024-01-01T04:00:00Z'),
    ];
    priceData.insert(...newPrices);

    assert.equal(priceData.length, 6);
    const times = Array.from(priceData).map(p => p.time);
    assert.deepEqual(
      times,
      [
        '2024-01-01T00:00:00.000Z',
        '2024-01-01T01:00:00.000Z',
        '2024-01-01T01:30:00.000Z',
        '2024-01-01T02:00:00.000Z',
        '2024-01-01T03:00:00.000Z',
        '2024-01-01T04:00:00.000Z',
      ]
    );
  });

  test('handle resolution ordering', () => {
    const priceData = new PriceData();
    const prices = [
      createPrice('2024-01-01T00:00:00Z', 'PT1H'),
      createPrice('2024-01-01T00:00:00Z', 'PT15M'),
      createPrice('2024-01-01T00:00:00Z', 'PT30M'),
    ];
    priceData.insert(...prices);

    const resolutions = Array.from(priceData).map(p => p.resolution);
    assert.deepEqual(
      resolutions,
      ['PT15M', 'PT30M', 'PT1H']
    );
  });

  test('handle domain ordering', () => {
    const priceData = new PriceData();
    const prices = [
      createPrice('2024-01-01T00:00:00Z', 'PT15M', 'SE'),
      createPrice('2024-01-01T00:00:00Z', 'PT15M', 'FI'),
      createPrice('2024-01-01T00:00:00Z', 'PT15M', 'NO'),
    ];
    priceData.insert(...prices);

    const domains = Array.from(priceData).map(p => p.domain);
    assert.deepEqual(
      domains,
      ['FI', 'NO', 'SE']
    );
  });

  test('replace duplicates with new values', () => {
    const priceData = new PriceData();
    const original = createPrice('2024-01-01T00:00:00Z', 'PT15M', 'FI', 100);
    const updated = createPrice('2024-01-01T00:00:00Z', 'PT15M', 'FI', 200);

    priceData.insert(original);
    priceData.insert(updated);

    assert.equal(priceData.length, 1);
    assert.equal(priceData[0].price, 200);
  });

  test('handle large datasets efficiently', () => {
    const priceData = new PriceData();
    
    // Create prices for 10 days with 15-minute intervals
    const prices = [];
    const startDate = new Date('2024-01-01T00:00:00Z');
    const interval = 15 * 60 * 1000; // 15 minutes in milliseconds
    const totalPoints = 10 * 24 * 4; // 10 days * 24 hours * 4 periods per hour

    // Add different domain prices for each time point
    const domains = ['FI', 'SE', 'NO'];
    
    for (let i = 0; i < totalPoints; i++) {
      const time = new Date(startDate.getTime() + (i * interval));
      for (const domain of domains) {
        prices.push(createPrice(time, 'PT15M', domain, 100 + i));
      }
    }

    console.log(`Created ${prices.length} test prices`);
    
    const start = performance.now();
    priceData.insert(...prices);
    const end = performance.now();
    
    const expectedLength = totalPoints * domains.length;
    console.log(`Expected ${expectedLength} prices, got ${priceData.length}`);
    
    assert.equal(priceData.length, expectedLength, 'Should have correct number of price points');
    assert.ok(end - start < 1000, 'Should complete in under 1 second');

    // Verify no duplicate time+domain combinations
    const timeDomainsSet = new Set();
    for (const price of priceData) {
      const key = `${price.time}-${price.domain}`;
      assert.ok(!timeDomainsSet.has(key), `Duplicate found: ${key}`);
      timeDomainsSet.add(key);
    }
  });

  describe('compare', () => {
    test('compare times correctly', () => {
      const p1 = createPrice('2024-01-01T00:00:00Z');
      const p2 = createPrice('2024-01-01T01:00:00Z');
      assert.ok(comparePricePoints(p1, p2) < 0);
      assert.ok(comparePricePoints(p2, p1) > 0);
    });

    test('compare resolutions when times are equal', () => {
      const p1 = createPrice('2024-01-01T00:00:00Z', 'PT15M');
      const p2 = createPrice('2024-01-01T00:00:00Z', 'PT1H');
      assert.ok(comparePricePoints(p1, p2) < 0);
    });

    test('compare domains when times and resolutions are equal', () => {
      const p1 = createPrice('2024-01-01T00:00:00Z', 'PT15M', 'FI');
      const p2 = createPrice('2024-01-01T00:00:00Z', 'PT15M', 'SE');
      assert.ok(comparePricePoints(p1, p2) < 0);
    });

    test('return 0 for identical prices', () => {
      const p1 = createPrice('2024-01-01T00:00:00Z');
      const p2 = createPrice('2024-01-01T00:00:00Z');
      assert.equal(comparePricePoints(p1, p2), 0);
    });
  });
});