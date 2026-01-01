
import React from 'react';
import { QueueListIcon, TrashIcon, ArrowsRightLeftIcon } from './Icons';

interface SavedComparisonsViewProps {
  savedList: string[][];
  onSelect: (phones: string[]) => void;
  onRemove: (index: number) => void;
}

const SavedComparisonsView: React.FC<SavedComparisonsViewProps> = ({ savedList, onSelect, onRemove }) => {
  return (
    <div className="animate-fade-in h-full">
        <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <QueueListIcon className="w-5 h-5 text-indigo-500" />
            Saved Battles
        </h3>
        {savedList.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {savedList.map((phones, index) => (
                    <div key={index} className="group flex items-center justify-between gap-2 p-3 bg-white/60 dark:bg-gray-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all">
                        <button onClick={() => onSelect(phones)} className="text-left flex-grow hover:text-blue-500 transition-colors truncate text-text-primary flex items-center gap-2">
                            <span className="font-semibold">{phones[0]}</span>
                            <ArrowsRightLeftIcon className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold">{phones[1]}</span>
                        </button>
                        <button onClick={() => onRemove(index)} className="p-1.5 rounded-lg text-slate-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        ) : (
            <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
                <QueueListIcon className="w-8 h-8 opacity-20" />
                <p>No battles saved yet.</p>
            </div>
        )}
    </div>
  );
};

export default SavedComparisonsView;
