
import React from 'react';

interface SpecBarProps {
  value: number;
  maxValue: number;
  isWinner: boolean;
}

const SpecBar: React.FC<SpecBarProps> = ({ value, maxValue, isWinner }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="absolute inset-y-0 left-0 w-full overflow-hidden opacity-10 group-hover:opacity-20 transition-opacity">
      <div
        className={`h-full transition-all duration-1000 ease-out ${
          isWinner 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
            : 'bg-slate-500'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default SpecBar;
