
import React from 'react';
import { ClockIcon, TrashIcon } from './Icons';

interface HistoryViewProps {
  history: string[][];
  onSelect: (phones: string[]) => void;
  onRemove: (index: number) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelect, onRemove }) => {
  return (
    <div className="animate-fade-in">
        <h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-text-secondary" />
            Comparison History
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {history.map((phones, index) => (
                <div key={index} className="group flex items-center justify-between gap-2 p-3 bg-slate-200/60 dark:bg-gray-800 rounded-md">
                    <button onClick={() => onSelect(phones)} className="text-left flex-grow hover:text-blue-500 transition-colors truncate text-text-primary">
                        {phones[0]} <span className="text-text-secondary mx-1">vs</span> {phones[1]}
                    </button>
                     <button onClick={() => onRemove(index)} className="text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    </div>
  );
};

export default HistoryView;
