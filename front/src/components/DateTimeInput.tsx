import React from "react";

interface DateTimeInputProps {
  onChange: (date: Date) => void;
}

export const DateTimeInput: React.FC<DateTimeInputProps> = ({ onChange, ...props }) => {
  console.log(props, "DateTimeInput render");
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log(e.target, { name, value });

    onChange(new Date(value));
  };

  return (
    <input type="datetime-local" onChange={handleChange} {...props} />
  );
};

export default DateTimeInput;
