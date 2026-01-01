
import React from 'react';
import { StarIcon, TrashIcon } from './Icons';

interface FavoritesViewProps {
  favorites: string[];
  onSelect: (phoneName: string) => void;
  onRemove: (phoneName: string) => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ favorites, onSelect, onRemove }) => {
  return (
    <div className="animate-fade-in">
        <h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
            <StarIcon className="w-5 h-5 text-yellow-400" />
            My Favorites
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
            {favorites.map(phone => (
                <div key={phone} className="group flex items-center justify-between gap-2 p-3 bg-slate-200/60 dark:bg-gray-800 rounded-md">
                    <button onClick={() => onSelect(phone)} className="text-left flex-grow hover:text-blue-500 transition-colors truncate text-text-primary">
                        {phone}
                    </button>
                    <button onClick={() => onRemove(phone)} className="text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    </div>
  );
};

export default FavoritesView;
