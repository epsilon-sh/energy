import { Duration } from "date-fns";

export type Measurement = {
  startTime: Date
  duration: Duration
  quantity: string

  meteringPointGSRN?: string
  productType?: string
  resolution?: string
  unitType?: string
  readingType?: string
  quality?: string
}

export declare const validateRow: (fields: string[]) => boolean;

export declare const parseRow: (fields: string[]) => Measurement;

export declare const extractRow: (line: string, delim?: string) => Measurement | undefined;

export declare const parseDsv: (fileContent: string, delimiter?: string) => Measurement[];
