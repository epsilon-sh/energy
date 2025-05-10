import { getCheapest } from "./reducer.mjs";
import postalCodes from "../data/postalCodes.mjs";

const BASE_URL =
  "https://ev-shv-prod-app-wa-consumerapi1.azurewebsites.net/api/productlist";

/**
 * Fetches electricity contracts for a given postal code
 * @param {string} postalCode - Finnish postal code
 * @returns {Promise<Array>} Array of contract objects
 * @throws {Error} If postal code is invalid or API request fails
 */
const getContracts = async (postalCode) => {
  if (!postalCode || typeof postalCode !== "string") {
    throw new Error("Invalid postal code format");
  }

  if (!postalCodes.includes(postalCode)) {
    throw new Error("Unsupported postal code");
  }

  const response = await fetch(`${BASE_URL}/${postalCode}`);

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error(`Unexpected content type: ${contentType}`);
  }

  return response.json();
};

/**
 * Fetches best available electricity contracts for given postal code and filters
 * @param {string} postalCode - Finnish postal code
 * @param {Object} filters - Filter criteria for contracts
 * @param {boolean} [full=true] - Whether to include full contract details
 * @returns {Promise<Object>} Object containing best spot and fixed price contracts
 */
const fetchBestContracts = async (postalCode, filters, full = true) => {
  try {
    const allContracts = await getContracts(postalCode);
    return {
      meta: { message: "OK", postalCode, filters },
      data: {
        bestSpot: getCheapest(allContracts, "Spot", filters, full),
        bestFixed: getCheapest(allContracts, "FixedPrice", filters, full),
      },
    };
  } catch (error) {
    return {
      meta: { message: error.message, postalCode, filters },
      data: { bestSpot: null, bestFixed: null },
    };
  }
};

export default fetchBestContracts;
