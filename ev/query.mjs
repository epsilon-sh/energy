import { extractContracts } from "./reducer.mjs";

const BASE_URL =
  "https://ev-shv-prod-app-wa-consumerapi1.azurewebsites.net/api/productlist";

const defaultParams = {
  postalCode: undefined,
  // authCode?: 'GUEST', // TODO: also return name of contract if valid authCode is arrached [NOT NEEDED FOR NOW]
};

const getContracts = async (params = defaultParams) => {
  const url = new URL(BASE_URL);
  params = { ...defaultParams, ...params };
  url.search = new URLSearchParams(params);

  console.log("Getting productlist for postalCode ", params.postalCode);

  const response = await fetch(url);

  if (!response.ok)
    console.error("Error fetching data", response.status || response.error);

  const expected = "application/json; charset=urf-8";
  const contentType = response.headers.get("content-type");
  console.log("Got response type:", contentType);

  const page = await response.text();

  if (contentType === expected) {
    console.log("Reading JSON page.");
    const parsed = parser.parse(page);

    if (parsed.Publication_MarketDocument) {
      return parsed.Publication_MarketDocument;
    }
  } else {
    console.error(
      `Unsupported response body type: ${contentType} (expect ${expected})`,
    );
    console.log(page);
    return [];
  }

  throw new Error("Error handling EV new (nimpl)");
};

const fetchBestContracts = async (postalCode) => {
  const allContracts = extractContracts(getContracts(postalCode));
  // TODO: get the cheapest Spot and the cheapest Fixed
  return allContracts[0], allContracts[1];
};

export default fetchBestContracts;
