import React, { useState } from 'react';

interface ContractSearchProps {
  onContractSelect: (contractId: string | null) => void;
}

export const ContractSearch: React.FC<ContractSearchProps> = ({ onContractSelect }) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContractSelect(searchValue || null);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="Enter contract ID"
        className="px-2 py-1 border rounded"
      />
      <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded">
        Search
      </button>
      {searchValue && (
        <button 
          type="button" 
          onClick={() => {
            setSearchValue('');
            onContractSelect(null);
          }}
          className="px-3 py-1 bg-gray-300 rounded"
        >
          Clear
        </button>
      )}
    </form>
  );
};
