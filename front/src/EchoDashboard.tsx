import React from "react";
import { BestContractsApiResponse, BestContractsApiResponseData, useBestContracts } from "./useBestContracts";
import { useSearchParams } from "react-router-dom";
import { startOfWeek, endOfDay } from "date-fns";

const defaults = {
  start: startOfWeek(new Date()).toISOString(),
  end: endOfDay(new Date()).toISOString(),
  consumption: "5000",
  postcode: "00100",
};

let contractData: BestContractsApiResponseData;

const EchoDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = {
    postalCode: searchParams.get("postcode") || defaults.postcode,
    consumption: searchParams.get("consumption") || defaults.consumption,
  };

  const { bestContracts } = useBestContracts(query);

  if (bestContracts.isLoading === true) {
    console.log('loading...');
  } else {
    const currentData = bestContracts.data as BestContractsApiResponse;
    contractData = currentData.data;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set(name, value);
      return newParams;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = new FormData(form).get("email");
    console.log("Offer requested for:", email);
  };

  return (
    <div className="container">
      <header>
        <h1 className="mb-0">epsilon Echo</h1>
        <p className="mt-0">empowering today</p>
      </header>

      <main>
        {bestContracts.isLoading ? ('loading...') : (
          <section>
            <div className="estimate-group border-bottom">
              <div className="spot-price">
                <div className="price-component">
                  <span className="amount">
                    {contractData.Spot.instantPricing.CentPerKiwattHour.toFixed(2)}
                  </span>
                  <legend className="unit">cts/kWh</legend>
                </div>
                <label>SPOT energy price</label>
                <div className="future">
                  {(contractData.FixedPrice.instantPricing.CentPerKiwattHour).toFixed(2)}
                  cts/kWh estimate
                </div>
              </div>

              <div className="estimate-inputs">
                <div className="input-group">
                  <label htmlFor="postcode">Postcode</label>
                  <input
                    type="text"
                    id="postcode"
                    name="postcode"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    placeholder="00150"
                    required
                    value={query.postalCode}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="consumption">Annual consumption (kWh)</label>
                  <input
                    type="number"
                    id="consumption"
                    name="consumption"
                    min="0"
                    step="100"
                    placeholder="5000"
                    required
                    value={query.consumption}
                    onChange={handleInputChange}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={bestContracts.isLoading}
                >
                  {bestContracts.isLoading ? "Loading..." : "Refresh estimates"}
                </button>
              </div>
            </div>

            <legend className="subtitle">
              Yearly savings:{" "}
              <span className="success">
                {((contractData.FixedPrice.annualizedCost.total + contractData.Spot.annualizedCost.total) / 2).toFixed(2)}€
              </span>{" "}
              on average.
            </legend>

            <div className="contracts">
              <div className="contract-item">
                <div className="contract-details">
                  <div className="rate-component">
                    <div className="rate">
                      {contractData.Spot.instantPricing.CentPerKiwattHour.toFixed(2)}
                    </div>
                    <legend className="unit">cts/kWh</legend>
                  </div>
                  <label>SPOT + 0.43cts/kWh</label>
                  <div className="monthly">
                    {contractData.Spot.instantPricing.EurPerMonth.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="contract-item">
                <div className="contract-details">
                  <div className="rate-component">
                    <div className="rate">
                      {contractData.FixedPrice.instantPricing.CentPerKiwattHour.toFixed(2)}
                    </div>
                    <legend className="unit">cts/kWh</legend>
                  </div>
                  <label>Fixed price</label>
                  <div className="monthly">
                    {contractData.FixedPrice.instantPricing.EurPerMonth.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-m">
          <p className="subtitle">10€ bonus for new customers.</p>
          <form
            className="flex-col mx-auto mt-0"
            name="offer"
            method="POST"
            onSubmit={handleOfferSubmit}
          >
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              required
            />
            <button type="submit">Free offer to your inbox!</button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default EchoDashboard;
