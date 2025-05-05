import { writeFileSync } from "fs";
import { formatDate } from "../entso/utils.mjs";
import { getDocumentTypeKey, getDomainKey } from "../entso/params.mjs";

const START_DATE = "2025-01-01";
const END_DATE = "2025-01-31";
const BASE_URL = "https://web-api.tp.entsoe.eu/api";
const OUTPUT_PATH = "../data/price.import.xml";

const params = {
  securityToken: process.env.ENTSO_TOKEN || "ENTSO_GUEST",
  documentType: getDocumentTypeKey("DAY_AHEAD_PRICES"),
  in_Domain: getDomainKey("FI"),
  out_Domain: getDomainKey("FI"),
  periodStart: formatDate(new Date(START_DATE)),
  periodEnd: formatDate(new Date(END_DATE)),
};

const url = new URL(BASE_URL);
url.search = new URLSearchParams(params);

console.log(`Fetching prices from ${START_DATE} to ${END_DATE}`);
console.log(`Fetching from: ${url}`);

fetch(url)
  .then((response) => response.text())
  .then((xml) => {
    writeFileSync(OUTPUT_PATH, xml);
    console.log("Raw XML price data written to ", OUTPUT_PATH);
  })
  .catch((error) => {
    console.error("Failed to fetch data:", error);
    process.exit(1);
  });
