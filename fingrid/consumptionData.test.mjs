import { ConsumptionData } from "./consumptionData.mjs";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

describe("ConsumptionData.groupBy", async () => {
  let data;

  beforeEach(() => {
    data = new ConsumptionData();
  });

  it("should handle simple 15min to 1hour conversion", async () => {
    data.push(
      {
        startTime: "2024-01-01T00:00:00Z",
        quantity: "10",
        unit: "kWh",
        resolution: "PT15M",
        meteringPoint: "MP1",
        productType: "Energy",
        readingType: "Usage",
      },
      {
        startTime: "2024-01-01T00:15:00Z",
        quantity: "15",
        unit: "kWh",
        resolution: "PT15M",
        meteringPoint: "MP1",
        productType: "Energy",
        readingType: "Usage",
      },
      {
        startTime: "2024-01-01T00:30:00Z",
        quantity: "20",
        unit: "kWh",
        resolution: "PT15M",
        meteringPoint: "MP1",
        productType: "Energy",
        readingType: "Usage",
      },
      {
        startTime: "2024-01-01T00:45:00Z",
        quantity: "15",
        unit: "kWh",
        resolution: "PT15M",
        meteringPoint: "MP1",
        productType: "Energy",
        readingType: "Usage",
      },
    );

    const result = data.groupBy("PT1H");

    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      startTime: "2024-01-01T00:00:00.000Z",
      quantity: 60,
      unit: "kWh",
      resolution: "PT1H",
      meteringPoint: "MP1",
      productType: "Energy",
      readingType: "Usage",
    });
  });

  it("should handle 1hour to 15min conversion", async () => {
    data.push({
      startTime: "2024-01-01T00:00:00Z",
      quantity: "60",
      unit: "kWh",
      resolution: "PT1H",
      meteringPoint: "MP1",
      productType: "Energy",
      readingType: "Usage",
    });

    const result = data.groupBy("PT15M");

    assert.equal(result.length, 4);
    result.forEach((measurement) => {
      assert.equal(measurement.quantity, 15);
      assert.equal(measurement.unit, "kWh");
      assert.equal(measurement.resolution, "PT15M");
      assert.equal(measurement.meteringPoint, "MP1");
      assert.equal(measurement.productType, "Energy");
      assert.equal(measurement.readingType, "Usage");
    });
  });

  it("should handle unit conversions", async () => {
    data.push({
      startTime: "2024-01-01T00:00:00Z",
      quantity: "1",
      unit: "MWh",
      resolution: "PT1H",
      meteringPoint: "MP1",
      productType: "Energy",
      readingType: "Usage",
    });

    const result = data.groupBy("PT1H");

    assert.equal(result[0].quantity, 1000);
    assert.equal(result[0].unit, "kWh");
  });

  it("should handle partial data with extrapolation", async () => {
    data.push(
      {
        startTime: "2024-01-01T00:00:00Z",
        quantity: "10",
        unit: "kWh",
        resolution: "PT15M",
        meteringPoint: "MP1",
        productType: "Energy",
        readingType: "Usage",
      },
      {
        startTime: "2024-01-01T00:15:00Z",
        quantity: "15",
        unit: "kWh",
        resolution: "PT15M",
        meteringPoint: "MP1",
        productType: "Energy",
        readingType: "Usage",
      },
      {
        startTime: "2024-01-01T00:30:00Z",
        quantity: "20",
        unit: "kWh",
        resolution: "PT15M",
        meteringPoint: "MP1",
        productType: "Energy",
        readingType: "Usage",
      },
    );

    const result = data.groupBy("PT1H");

    assert.equal(result[0].quantity, 60);
    assert.equal(result[0].unit, "kWh");
  });

  it("should keep measurements with different characteristics separate", async () => {
    data.push(
      {
        startTime: "2024-01-01T00:00:00Z",
        quantity: "10",
        unit: "kWh",
        resolution: "PT15M",
        meteringPoint: "MP1",
        productType: "Energy",
        readingType: "Usage",
      },
      {
        startTime: "2024-01-01T00:00:00Z",
        quantity: "20",
        unit: "kWh",
        resolution: "PT15M",
        meteringPoint: "MP2",
        productType: "Energy",
        readingType: "Usage",
      },
    );

    const result = data.groupBy("PT15M");

    assert.equal(result.length, 2);
    assert.equal(result.find((m) => m.meteringPoint === "MP1").quantity, 10);
    assert.equal(result.find((m) => m.meteringPoint === "MP2").quantity, 20);
  });
});

describe("ConsumptionData.insert", async () => {
  let data;

  const createMeasurement = (
    startTime,
    resolution = "PT15M",
    meteringPoint = "MP1",
    quantity = 100,
  ) => ({
    startTime: new Date(startTime).toISOString(),
    resolution,
    meteringPoint,
    productType: "Energy",
    readingType: "Usage",
    quantity,
    unit: "kWh",
  });

  beforeEach(() => {
    data = new ConsumptionData();
  });

  it("should insert into empty array", () => {
    const measurement = createMeasurement("2024-01-01T00:00:00Z");
    data.insert(measurement);
    assert.equal(data.length, 1);
    assert.deepEqual(data[0], measurement);
  });

  it("should handle empty insert", () => {
    const measurement = createMeasurement("2024-01-01T00:00:00Z");
    data.push(measurement);
    data.insert();
    assert.equal(data.length, 1);
    assert.deepEqual(data[0], measurement);
  });

  it("should maintain sort order when inserting multiple items", () => {
    const measurements = [
      createMeasurement("2024-01-01T01:00:00Z"),
      createMeasurement("2024-01-01T02:00:00Z"),
      createMeasurement("2024-01-01T03:00:00Z"),
    ];
    data.insert(...measurements);

    const newMeasurements = [
      createMeasurement("2024-01-01T00:00:00Z"),
      createMeasurement("2024-01-01T01:30:00Z"),
      createMeasurement("2024-01-01T04:00:00Z"),
    ];
    data.insert(...newMeasurements);

    assert.equal(data.length, 6);
    assert.deepEqual(
      Array.from(data).map((m) => m.startTime),
      [
        "2024-01-01T00:00:00.000Z",
        "2024-01-01T01:00:00.000Z",
        "2024-01-01T01:30:00.000Z",
        "2024-01-01T02:00:00.000Z",
        "2024-01-01T03:00:00.000Z",
        "2024-01-01T04:00:00.000Z",
      ],
    );
  });

  it("should handle resolution ordering", () => {
    const measurements = [
      createMeasurement("2024-01-01T00:00:00Z", "PT1H"),
      createMeasurement("2024-01-01T00:00:00Z", "PT15M"),
      createMeasurement("2024-01-01T00:00:00Z", "PT30M"),
    ];
    data.insert(...measurements);

    assert.deepEqual(
      Array.from(data).map((m) => m.resolution),
      ["PT15M", "PT30M", "PT1H"],
    );
  });

  it("should handle meteringPoint ordering", () => {
    const measurements = [
      createMeasurement("2024-01-01T00:00:00Z", "PT15M", "MP3"),
      createMeasurement("2024-01-01T00:00:00Z", "PT15M", "MP1"),
      createMeasurement("2024-01-01T00:00:00Z", "PT15M", "MP2"),
    ];
    data.insert(...measurements);

    assert.deepEqual(
      Array.from(data).map((m) => m.meteringPoint),
      ["MP1", "MP2", "MP3"],
    );
  });

  it("should replace duplicates with new values", () => {
    const original = createMeasurement(
      "2024-01-01T00:00:00Z",
      "PT15M",
      "MP1",
      100,
    );
    const updated = createMeasurement(
      "2024-01-01T00:00:00Z",
      "PT15M",
      "MP1",
      200,
    );

    data.insert(original);
    data.insert(updated);

    assert.equal(data.length, 1);
    assert.equal(data[0].quantity, 200);
  });

  it("should handle large datasets efficiently", () => {
    const largeMeasurementSet1 = Array.from({ length: 10000 }, (_, i) => {
      const d = new Date();
      d.setSeconds(d.getSeconds() + i);
      return createMeasurement(d.toISOString());
    });
    const largeMeasurementSet2 = Array.from({ length: 10000 }, (_, i) => {
      const d = new Date();
      d.setSeconds(d.getSeconds() + i + 10000);
      return createMeasurement(d.toISOString());
    });

    const start = performance.now();
    data.insert(...largeMeasurementSet1);
    data.insert(...largeMeasurementSet2);
    const end = performance.now();

    assert.ok(
      end - start < 1000,
      "Inserting large datasets should be efficient",
    );
  });
});
