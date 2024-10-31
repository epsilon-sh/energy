import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PriceData, comparePricePoints } from './priceData.mjs'

const createPrice = (time, resolution = 'PT15M', domain = 'FI', price = 100) => ({
  time: new Date(time).toISOString(),
  resolution,
  domain,
  price
});

test('PriceData', async (t) => {
  await t.test('insert into empty array', () => {
    const priceData = new PriceData();
    const price = createPrice('2024-01-01T00:00:00Z');
    priceData.insert(price);
    assert.equal(priceData.length, 1);
    assert.deepEqual(priceData[0], price);
  });

  await t.test('insert empty array', () => {
    const price = createPrice('2024-01-01T00:00:00Z');
    const priceData = new PriceData(price);
    priceData.insert();
    assert.equal(priceData.length, 1);
    assert.deepEqual(priceData[0], price);
  });

  await t.test('maintain sort order when inserting multiple items', () => {
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
    assert.deepEqual(
      [...priceData.map(p => p.time)],
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

  await t.test('handle resolution ordering', () => {
    const priceData = new PriceData();
    const prices = [
      createPrice('2024-01-01T00:00:00Z', 'PT1H'),
      createPrice('2024-01-01T00:00:00Z', 'PT15M'),
      createPrice('2024-01-01T00:00:00Z', 'PT30M'),
    ];
    priceData.insert(...prices);

    assert.deepEqual(
      [...priceData.map(p => p.resolution)],
      ['PT15M', 'PT30M', 'PT1H']
    );
  });

  await t.test('handle domain ordering', () => {
    const priceData = new PriceData();
    const prices = [
      createPrice('2024-01-01T00:00:00Z', 'PT15M', 'SE'),
      createPrice('2024-01-01T00:00:00Z', 'PT15M', 'FI'),
      createPrice('2024-01-01T00:00:00Z', 'PT15M', 'NO'),
    ];
    priceData.insert(...prices);

    assert.deepEqual(
      [...priceData.map(p => p.domain)],
      ['FI', 'NO', 'SE']
    );
  });

  await t.test('replace duplicates with new values', () => {
    const priceData = new PriceData();
    const original = createPrice('2024-01-01T00:00:00Z', 'PT15M', 'FI', 100);
    const updated = createPrice('2024-01-01T00:00:00Z', 'PT15M', 'FI', 200);

    priceData.insert(original);
    priceData.insert(updated);

    assert.equal(priceData.length, 1);
    assert.equal(priceData[0].price, 200);
  });

  await t.test('handle large datasets efficiently', () => {
    const priceData = new PriceData();
    const largePriceSet1 = Array.from({ length: 10000 }, (_, i) => {
      const d = new Date()
      d.setSeconds(d.getSeconds() + i)
      return createPrice(d.toISOString())
    });
    const largePriceSet2 = Array.from({ length: 10000 }, (_, i) => {
      const d = new Date()
      d.setSeconds(d.getSeconds() + i + 10000)
      return createPrice(d.toISOString())
    });

    const start = performance.now();
    priceData.insert(...largePriceSet1);
    priceData.insert(...largePriceSet2);
    const end = performance.now();

    assert.equal(priceData.length, 20000);
    assert.ok(end - start < 1000, 'Should complete in under 1 second');
  });

  await t.test('compare function', async (t) => {
    await t.test('compare times correctly', () => {
      const p1 = createPrice('2024-01-01T00:00:00Z');
      const p2 = createPrice('2024-01-01T01:00:00Z');
      assert.ok(comparePricePoints(p1, p2) < 0);
      assert.ok(comparePricePoints(p2, p1) > 0);
    });

    await t.test('compare resolutions when times are equal', () => {
      const p1 = createPrice('2024-01-01T00:00:00Z', 'PT15M');
      const p2 = createPrice('2024-01-01T00:00:00Z', 'PT1H');
      assert.ok(comparePricePoints(p1, p2) < 0);
    });

    await t.test('compare domains when times and resolutions are equal', () => {
      const p1 = createPrice('2024-01-01T00:00:00Z', 'PT15M', 'FI');
      const p2 = createPrice('2024-01-01T00:00:00Z', 'PT15M', 'SE');
      assert.ok(comparePricePoints(p1, p2) < 0);
    });

    await t.test('return 0 for identical prices', () => {
      const p1 = createPrice('2024-01-01T00:00:00Z');
      const p2 = createPrice('2024-01-01T00:00:00Z');
      assert.equal(comparePricePoints(p1, p2), 0);
    });
  });
});
