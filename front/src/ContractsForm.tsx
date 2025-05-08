import React from 'react';
import { Contract } from './types/contract';

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
    <tbody className='my-s'>
      <tr>
        <th>{contract.name}</th>
      </tr>
      <tr>
        <td>
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
            className='mx-s'
          />
        </td><td>
          c/kWh
        </td>
      </tr>
      <tr>
        <td className='pb-s'>
          <label htmlFor={`${contract.name}-fee`}>Monthly Fee:</label>
        </td>
        <td className='pb-s'>
          <input
            type='number'
            id={`${contract.name}-fee`}
            step='0.05'
            value={contract.euroPerMonth}
            onChange={e => handleFeeChange(e.target.value)}
            className='mx-s'
          />
        </td><td>
          €
        </td>
      </tr>
    </tbody>
  );
};

type ContractFormProps = {
  contracts: Contract[];
  onUpdateContracts: (contracts: Contract[]) => void;
  onResetContracts: () => void;
}

const ContractsForm: React.FC<ContractFormProps> = ({
  contracts,
  onUpdateContracts,
  onResetContracts
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
        {contracts.map((contract, index) => (
          <ContractInput
            key={contract.name}
            contract={contract}
            onUpdate={(updated) => handleContractUpdate(index, updated)}
          />
        ))}
        <tfoot className='my-s text-right'>
          <tr>
            <th colSpan={2}>
              <button
                type='button'
                onClick={onResetContracts}
                className='mx-s'
              >
                Epsilon defaults
              </button>
            </th>
          </tr>
        </tfoot>
      </table>
    </form>
  );
};

export default ContractsForm;
