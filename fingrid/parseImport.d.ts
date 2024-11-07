import { Duration } from "date-fns";

export type Measurement = {
  startTime: Date;
  duration: Duration;
  quantity: string;
  meteringPointGSRN?: string;
  productType?: string;
  resolution?: string;
  unitType?: string;
  readingType?: string;
  quality?: string;
};

export declare const formats: {
  meteringPoint: (x: string) => string;
  productType: (x: string) => string;
  resolution: (x: string) => string;
  unitType: (x: string) => string;
  readingType: (x: string) => string;
  startTime: (st: string) => Date;
  quantity: (qty: string) => string;
  quality: (x: string) => string;
};

export declare const parseFields: (fields: string[]) => Measurement;

export declare const validateHeader: (header: string) => boolean;

export declare const validateRow: (line: string, sep?: string) => string[] | undefined;

export declare const extractRow: (line: string, delim?: string) => Measurement | undefined;

export declare const parseDsv: (fileContent: string, delimiter?: string) => Measurement[]; 