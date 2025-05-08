import React from 'react';
import { Contract } from './EnergyDashboard';

type ContractInputProps = {
  contract: Contract;
  onUpdate: (updatedContract: Contract) => void;
}

const ContractInput: React.FC<ContractInputProps> = ({ contract, onUpdate }) => {
  const handleFeeChange = (value: string) => {
    const euroPerMonth = parseFloat(value);
    if (!isNaN(euroPerMonth)) {
      onUpdate({
        ...contract,
        euroPerMonth
      });
    }
  };

  const handlePriceChange = (value: string) => {
    const centsPerKiwattHour = parseFloat(value);
    if (!isNaN(centsPerKiwattHour)) {
      onUpdate({
        ...contract,
        centsPerKiwattHour
      });
    }
  };

  return (
    <>
      <tr>
        <th className='pt-s'>{contract.name}</th>
      </tr>
      <tr>
        <td className='px-s'>
          <label htmlFor={`${contract.name}-price`}>Price:</label>
        </td>
        <td>
          <input
            type='number'
            id={`${contract.name}-price`}
            name={`${contract.name}_price`}
            step='0.05'
            value={contract.centsPerKiwattHour}
            onChange={e => handlePriceChange(e.target.value)}
          />
        </td><td className='va-baseline'>
          c/kWh
        </td>
      </tr>
      <tr>
        <td className='px-s'>
          <label htmlFor={`${contract.name}-fee`}>Monthly Fee:</label>
        </td>
        <td>
          <input
            type='number'
            id={`${contract.name}-fee`}
            step='0.05'
            value={contract.euroPerMonth}
            onChange={e => handleFeeChange(e.target.value)}
          />
        </td><td className='va-baseline'>
          €
        </td>
      </tr>
    </>
  );
};

type ContractFormProps = {
  contracts: Contract[];
  onUpdateContracts: (contracts: Contract[]) => void;
}

const ContractsForm: React.FC<ContractFormProps> = ({
  contracts,
  onUpdateContracts,
}) => {
  const handleContractUpdate = (index: number, updatedContract: Contract) => {
    const newContracts = [...contracts];
    newContracts[index] = updatedContract;
    onUpdateContracts(newContracts);
  };

  return (
    <form className='flex-col'>
      <table className='my-s mx-s'>
        <caption className='title'>Contract</caption>
        <tbody className='my-s'>
          {contracts.map((contract, index) => (
            // <tbody>
            <ContractInput
              key={contract.name}
              contract={contract}
              onUpdate={(updated) => handleContractUpdate(index, updated)}
            />
            // </tbody>
          ))}
        </tbody>
      </table>
    </form>
  );
};

export default ContractsForm;
