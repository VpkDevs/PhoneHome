
import React from 'react';

interface LoaderProps {
    message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = 'AI is analyzing the phones...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 space-y-4">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
      <p className="text-lg text-slate-600 dark:text-gray-300">{message}</p>
    </div>
  );
};

export default Loader;
