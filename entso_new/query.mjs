const startDate = new Date();
const endDate = new Date();
const BASE_URL =
  "https://ev-shv-prod-app-wa-consumerapi1.azurewebsites.net/api/productlist/20100";

const defaultParams = {
  // not needed for now
};

const getPrices = async (params = defaultParams) => {
  const url = new URL(BASE_URL);
  params = { ...defaultParams, ...params };
  url.search = new URLSearchParams(params);

  // console.log(
  //   `GET ENTSO RANGE ${params.periodStart} - ${params.periodEnd} | ${url}`,
  // );

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

  throw new Error("Error handling ENTSO new (nimpl)");
};

export default getPrices;
