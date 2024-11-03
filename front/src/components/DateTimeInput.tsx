import React from 'react';

interface DateTimeInputProps {
  onChange: (date: Date) => void;
  value?: Date;
}

type DateField = 'year' | 'month' | 'day' | 'hour';

export const DateTimeInput: React.FC<DateTimeInputProps> = ({ 
  onChange, 
  value: defaultValue = new Date('2023-01-01T00:00:00') 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const date = new Date(defaultValue);

    switch (name as DateField) {
      case 'year':
        date.setFullYear(Number(value));
        break;
      case 'month':
        date.setMonth(Number(value) - 1); // JS months are 0-based
        break;
      case 'day':
        date.setDate(Number(value));
        break;
      case 'hour':
        date.setHours(Number(value));
        break;
    }

    onChange(date);
  };

  const handleTodayClick = () => {
    onChange(new Date());
  };

  return (
    <div className="flex gap-2">
      <select 
        name="year" 
        defaultValue={defaultValue.getFullYear()}
        onChange={handleChange}
        className="p-2 border rounded"
      >
        {[2023, 2024].map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>

      <select 
        name="month" 
        defaultValue={defaultValue.getMonth() + 1}
        onChange={handleChange}
        className="p-2 border rounded"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
          <option key={month} value={month}>
            {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
          </option>
        ))}
      </select>

      <select 
        name="day" 
        defaultValue={defaultValue.getDate()}
        onChange={handleChange}
        className="p-2 border rounded"
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
          <option key={day} value={day}>{day}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleTodayClick}
        className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200"
      >
        Today
      </button>
    </div>
  );
};

export default DateTimeInput;
