import React from 'react';

type ButtonProps = React.HTMLAttributes<HTMLButtonElement>

export const Button: React.FC<ButtonProps> = props => {
  return <button {...props} />
};

export default Button;
