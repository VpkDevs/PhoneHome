
import React, { useState } from 'react';
import type { BatteryEstimate } from '../types';
import { BatteryIcon, SparklesIcon } from './Icons';
import { marked } from 'marked';

interface BatteryEstimatorProps {
  onGetEstimate: (profile: string) => Promise<BatteryEstimate | null>;
  results: BatteryEstimate | null;
}

const QUICK_PROFILES = [
  'Light Use (some messaging, browsing)',
  'Moderate Use (social media, music, some video)',
  'Heavy Use (gaming, video streaming, navigation)',
];

const createMarkup = (markdownText: string) => {
    const rawMarkup = marked(markdownText, { breaks: true, gfm: true });
    return { __html: rawMarkup };
};

const BatteryEstimator: React.FC<BatteryEstimatorProps> = ({ onGetEstimate, results }) => {
  const [customProfile, setCustomProfile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = async (profile: string) => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    const result = await onGetEstimate(profile);
    if (result?.error) {
        setError(result.error);
    }
    setIsLoading(false);
  };
  
  return (
    <div className="bg-card-background backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-border-color">
      <h3 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
        <BatteryIcon className="w-6 h-6 text-blue-500" />
        AI Battery Life Estimator
      </h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-text-secondary mb-2">Select a profile or describe your own:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROFILES.map(profile => (
              <button
                key={profile}
                onClick={() => handleEstimate(profile)}
                disabled={isLoading}
                className="text-sm bg-slate-200 hover:bg-slate-300 dark:bg-gray-700/50 dark:hover:bg-gray-700 disabled:opacity-50 text-slate-600 dark:text-gray-300 font-medium py-1.5 px-3 rounded-full transition-colors"
              >
                {profile}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customProfile}
            onChange={(e) => setCustomProfile(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEstimate(customProfile)}
            placeholder="e.g., Lots of TikTok and video calls"
            className="flex-grow bg-input-background border border-border-color rounded-lg px-4 py-2 text-text-primary placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            disabled={isLoading}
          />
          <button
            onClick={() => handleEstimate(customProfile)}
            disabled={isLoading || !customProfile}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            <SparklesIcon className="w-5 h-5" />
            Estimate
          </button>
        </div>
        {isLoading && (
            <div className="text-center pt-4 text-text-secondary animate-pulse">
                AI is calculating battery life...
            </div>
        )}
        {error && !isLoading && (
            <div className="text-center p-3 bg-red-500/10 text-red-400 rounded-lg">{error}</div>
        )}
        {results && !isLoading && !error && (
            <div className="pt-4 mt-4 border-t border-border-color animate-fade-in space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-100 dark:bg-gray-900/50 p-4 rounded-lg">
                        <p className="font-bold text-text-primary">{results.phone1_estimate}</p>
                    </div>
                     <div className="bg-slate-100 dark:bg-gray-900/50 p-4 rounded-lg">
                        <p className="font-bold text-text-primary">{results.phone2_estimate}</p>
                    </div>
                 </div>
                 <div className="prose text-sm" dangerouslySetInnerHTML={createMarkup(results.explanation)} />
            </div>
        )}
      </div>
    </div>
  );
};

export default BatteryEstimator;
