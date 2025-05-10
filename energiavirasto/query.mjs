import { filterContracts, getCheapest } from "./reducer.mjs";

const BASE_URL =
  "https://ev-shv-prod-app-wa-consumerapi1.azurewebsites.net/api/productlist";

const getContracts = async (postalCode) => {
  if (!postalCode) {
    throw new Error("postalCode is required");
  }

  const url = new URL(BASE_URL);
  const params = {
    postalCode,
  };

  console.log("Getting productlist for postalCode ", params.postalCode);

  const response = await fetch(url);

  if (!response.ok)
    console.error("Error fetching data", response.status || response.error);

  const expected = "application/json; charset=utf-8";
  const contentType = response.headers.get("content-type");
  console.log("Got response type:", contentType);

  if (contentType === expected) {
    console.log("Reading JSON page.");
    const resp = await response.json();
    return resp;
  } else {
    console.error(
      `Unsupported response body type: ${contentType} (expect ${expected})`,
    );
    throw new Error("Error handling EV new (nimpl)");
  }
};

const fetchBestContracts = async (postalCode, filters, full) => {
  let message = "OK",
    bestSpot = undefined,
    bestFixed = undefined;
  try {
    const allContracts = await getContracts(postalCode);
    const filteredContracts = filterContracts(allContracts, filters);
    bestSpot = getCheapest(filteredContracts, "Spot", full);
    bestFixed = getCheapest(filteredContracts, "FixedPrice", full);
  } catch (e) {
    message = e.message;
  }

  return {
    meta: {
      message,
      postalCode,
      filters,
    },
    data: {
      bestSpot,
      bestFixed,
    },
  };
};

export default fetchBestContracts;
