import React, { useState } from "react";
import contractsData from "../../../data/productlist.json";

interface ContractSearchProps {
  onContractSelect: (searchParams: SearchParams) => void;
}

interface SearchParams {
  companyName: string;
  contractType: string;
  postalCode: string;
}

export const ContractSearch: React.FC<ContractSearchProps> = ({ onContractSelect }) => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    companyName: "",
    contractType: "",
    postalCode: "",
  });

  // Get unique company names from JSON
  const uniqueCompanies = Array.from(new Set(
    contractsData.map(contract => contract.Company.Name),
  )).sort();

  // Get unique contract types from JSON
  const uniqueContractTypes = Array.from(new Set(
    contractsData.map(contract => contract.Details.ContractType),
  )).sort();

  const handlePostalCodeChange = (value: string) => {
    // Only allow 5 digits
    const sanitized = value.replace(/[^\d]/g, "").slice(0, 5);
    setSearchParams({ ...searchParams, postalCode: sanitized });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContractSelect(searchParams);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">

        <input
          type="text"
          value={searchParams.postalCode}
          onChange={(e) => handlePostalCodeChange(e.target.value)}
          placeholder="Postal Code (5 digits)"
          className="w-full px-2 py-1 border rounded"
          maxLength={5}
        />

        <div className="relative">
          <input
            type="text"
            value={searchParams.companyName}
            onChange={(e) => setSearchParams({ ...searchParams, companyName: e.target.value })}
            placeholder="Company Name"
            list="companies"
            className="w-full px-2 py-1 border rounded"
          />
          <datalist id="companies">
            {uniqueCompanies.map(company => (
              <option key={company} value={company} />
            ))}
          </datalist>
        </div>

        <select
          value={searchParams.contractType}
          onChange={(e) => setSearchParams({ ...searchParams, contractType: e.target.value })}
          className="w-full px-2 py-1 border rounded"
        >
          <option value="">Select Contract Type</option>
          {uniqueContractTypes.map(type => (
            <option key={type} value={type}>
              {type === "OpenEnded" ? "Open Ended" : type}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Search
        </button>
        {(searchParams.companyName || searchParams.contractType || searchParams.postalCode) && (
          <button
            type="button"
            onClick={() => {
              setSearchParams({ companyName: "", contractType: "", postalCode: "" });
              onContractSelect({ companyName: "", contractType: "", postalCode: "" });
            }}
            className="px-3 py-1 bg-gray-300 rounded"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
};
