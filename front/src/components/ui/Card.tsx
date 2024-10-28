import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Card: React.FC<CardProps> = ({ className = '', ...props }) => {
  return <div className={`card ${className}`} {...props} />;
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = props => <div {...props} />
export const CardTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = props => <div {...props} />
export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = props => <div {...props} />

export default Card;
