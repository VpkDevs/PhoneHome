
import React from 'react';
import { PhotoIcon, StarIcon, CheckIcon } from './Icons';

interface PhoneCardProps {
  name: string;
  subtitle?: string;
  imageUrl: string | null;
  isLoading: boolean;
  isFavorite: boolean;
  onToggleFavorite: (name: string) => void;
  isWinner?: boolean;
}

const PhoneCard: React.FC<PhoneCardProps> = ({ name, subtitle, imageUrl, isLoading, isFavorite, onToggleFavorite, isWinner }) => {
  return (
    <div className={`relative bg-card-background backdrop-blur-md p-6 rounded-[2rem] text-center flex flex-col items-center shadow-lg transition-all duration-500 ${isWinner ? 'border-2 border-blue-500/50 shadow-blue-500/20 scale-[1.02]' : 'border border-white/20 dark:border-white/5'}`}>
       
       {/* Winner Badge */}
       {isWinner && (
           <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 z-20">
               <CheckIcon className="w-3 h-3" /> Winner
           </div>
       )}

       <button 
          onClick={() => onToggleFavorite(name)} 
          className="absolute top-5 right-5 p-2.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-10"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <StarIcon className={`w-5 h-5 transition-all duration-300 ${isFavorite ? 'text-yellow-400 fill-current scale-110' : 'text-slate-400 dark:text-slate-500'}`} />
      </button>

      <div className="w-full h-72 mb-6 rounded-2xl bg-gradient-to-b from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 flex items-center justify-center p-4 relative overflow-hidden group">
        {isLoading ? (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <PhotoIcon className="w-10 h-10 text-slate-300 dark:text-gray-700 mb-3" />
                <span className="text-[10px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-widest">Generating Model</span>
            </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-105 animate-fade-in"
            onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                const icon = document.createElement('div');
                icon.innerHTML = '<span class="text-4xl">📱</span>';
                e.currentTarget.parentElement?.appendChild(icon);
            }}
          />
        ) : (
          <PhotoIcon className="w-16 h-16 text-slate-200 dark:text-gray-800" />
        )}
      </div>
      
      <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{name}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1 font-bold">{subtitle}</p>}
    </div>
  );
};

export default PhoneCard;
