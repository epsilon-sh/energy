import { describe, it, beforeEach, before, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import http from 'node:http';
import express from 'express';

// Set environment variables for testing
process.env.DB_STRING = ':memory:';
process.env.DB_CONSUMPTION_TABLE = 'measurements';

// Mock data
const mockDbData = [
  {
    MeteringPointGSRN: 'TEST_METERINGPOINT',
    'Product Type': '8716867000030',
    Resolution: 'PT15M',
    'Unit Type': 'kWh',
    'Reading Type': 'BN01',
    'Start Time': '2024-01-01T00:00:00Z',
    Quantity: 0.111,
    Quality: 'OK'
  },
  {
    MeteringPointGSRN: 'TEST_METERINGPOINT',
    'Product Type': '8716867000030',
    Resolution: 'PT15M',
    'Unit Type': 'kWh',
    'Reading Type': 'BN01',
    'Start Time': '2024-01-01T00:15:00Z',
    Quantity: 0.112,
    Quality: 'OK'
  }
];

const mockResponseData = [
  {
    meteringPoint: 'TEST_METERINGPOINT',
    startTime: '2024-01-01T00:00:00.000Z',
    quantity: 0.111,
    resolution: 'PT1H'
  },
  {
    meteringPoint: 'TEST_METERINGPOINT',
    startTime: '2024-01-01T01:00:00.000Z',
    quantity: 0.442,
    resolution: 'PT1H'
  }
];

const mockImportedData = [
  {
    meteringPoint: '643007574000138589',
    productType: '8716867000030',
    resolution: 'PT15M',
    unitType: 'kWh',
    readingType: 'BN01',
    startTime: new Date('2024-01-01T00:00:00Z'),
    quantity: 0.111,
    quality: 'OK'
  },
  {
    meteringPoint: '643007574000138589',
    productType: '8716867000030',
    resolution: 'PT15M',
    unitType: 'kWh',
    readingType: 'BN01',
    startTime: new Date('2024-01-01T00:15:00Z'),
    quantity: 0.112,
    quality: 'OK'
  }
];

describe('Consumption API Routes', async () => {
  let server;
  let baseUrl;

  // Capture original console methods to suppress errors in error test cases
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  before(async () => {
    // Silence expected logs and errors
    console.log = (...args) => {
      if (!args.some(arg =>
        String(arg).includes('sync exec tx insert()') ||
        String(arg).includes('Load ../data/fingrid.import.csv') ||
        String(arg).includes('Parse') ||
        String(arg).includes('Data size:') ||
        String(arg).includes('DB ') ||
        String(arg).includes(' found') ||
        String(arg).includes(' sent')
      )) {
        originalConsoleLog(...args);
      }
    };

    console.error = (...args) => {
      if (!args.some(arg =>
        String(arg).includes('Database error') ||
        String(arg).includes('Upload error') ||
        String(arg).includes('File read error')
      )) {
        originalConsoleError(...args);
      }
    };

    // Register custom loaders for mocking dependencies
    register('./mocks/consumption/index.mjs', import.meta.url);

    // Initialize global variables for mock tracking
    globalThis.mockCalls = {
      getDatabase: [],
      dataInsert: [],
      dataPush: [],
      parseDsv: [],
      readFile: [],
      unlink: []
    };

    // Store mock data in global scope for the mocks to access
    globalThis.mockDbData = mockDbData;
    globalThis.mockResponseData = mockResponseData;
    globalThis.mockImportedData = mockImportedData;
    globalThis.shouldThrowDatabaseError = false;
    globalThis.shouldThrowFileReadError = false;
  });

  after(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(async () => {
    // Reset mock tracking
    globalThis.mockCalls = {
      getDatabase: [],
      dataInsert: [],
      dataPush: [],
      parseDsv: [],
      readFile: [],
      unlink: []
    };

    globalThis.shouldThrowDatabaseError = false;
    globalThis.shouldThrowFileReadError = false;

    // Setup test server
    const app = express();
    app.use(express.json());

    // Import our router after mocks are set up
    const { default: consumptionRouter } = await import('../routes/consumption.mjs');
    app.use('/consumption', consumptionRouter);

    // Start server
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  });

  afterEach(async () => {
    // Close server
    await new Promise(resolve => server.close(resolve));
  });

  describe('GET /consumption', () => {
    it('should return consumption data with default parameters', async () => {
      const response = await fetch(`${baseUrl}/consumption`);

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data, mockResponseData);
      assert.ok(globalThis.mockCalls.getDatabase.length > 0);
    });

    it('should accept custom date range parameters', async () => {
      const response = await fetch(
        `${baseUrl}/consumption?start=2024-02-01T00:00:00Z&end=2024-02-02T00:00:00Z`
      );

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data, mockResponseData);
    });

    it('should accept start and period parameters', async () => {
      const response = await fetch(
        `${baseUrl}/consumption?start=2024-02-01T00:00:00Z&period=P1D`
      );

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data, mockResponseData);
    });

    it('should accept custom resolution parameter', async () => {
      const response = await fetch(
        `${baseUrl}/consumption?resolution=PT30M`
      );

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data, mockResponseData);
    });

    it('should accept custom metering point parameter', async () => {
      const response = await fetch(
        `${baseUrl}/consumption?meteringPoint=CUSTOM_METERINGPOINT`
      );

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data, mockResponseData);
    });

    it('should handle errors gracefully', async () => {
      // Set flag to make db mock throw error
      globalThis.shouldThrowDatabaseError = true;

      const response = await fetch(`${baseUrl}/consumption`);

      assert.equal(response.status, 500);
    });
  });

  describe('POST /consumption/upload', () => {
    it('should process uploaded file successfully', async () => {
      const formData = new FormData();
      const fileContent = 'mock csv content';
      const file = new File([fileContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);

      const response = await fetch(`${baseUrl}/consumption/upload`, {
        method: 'POST',
        body: formData,
      });

      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.message, 'File uploaded and processed successfully');
      assert.equal(result.count, 2);
      assert.ok(globalThis.mockCalls.unlink.length > 0);
    });

    it('should handle file processing errors', async () => {
      globalThis.shouldThrowFileReadError = true;

      const formData = new FormData();
      const fileContent = 'mock csv content';
      const file = new File([fileContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);

      const response = await fetch(`${baseUrl}/consumption/upload`, {
        method: 'POST',
        body: formData,
      });

      assert.equal(response.status, 500);
      const result = await response.json();
      assert.equal(result.message, 'File read error');
    });
  });

  describe('Initial data loading', () => {
    it('should attempt to load initial data on startup', async () => {
      await import('../routes/consumption.mjs?t=' + Date.now());
      assert.ok(globalThis.mockCalls.readFile.length > 0);
    });
  });
});
