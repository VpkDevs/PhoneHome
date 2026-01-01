
import React, { useState } from 'react';
import type { UpgradeAnalysis } from '../types';
import { ArrowUpCircleIcon, SparklesIcon } from './Icons';
import { marked } from 'marked';

interface UpgradeAnalyzerProps {
  onAnalyze: (currentPhone: string) => Promise<UpgradeAnalysis | null>;
  results: UpgradeAnalysis | null;
}

const createMarkup = (markdownText: string) => {
    if (!markdownText) return { __html: '' };
    const rawMarkup = marked(markdownText, { breaks: true, gfm: true });
    return { __html: rawMarkup };
};

const UpgradeAnalyzer: React.FC<UpgradeAnalyzerProps> = ({ onAnalyze, results }) => {
  const [currentPhone, setCurrentPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!currentPhone) return;
    setIsLoading(true);
    setError(null);
    const result = await onAnalyze(currentPhone);
    if (result?.error) {
        setError(result.error);
    }
    setIsLoading(false);
  };
  
  return (
    <div className="bg-card-background backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-border-color">
      <h3 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
        <ArrowUpCircleIcon className="w-6 h-6 text-indigo-500" />
        Upgrade Worthiness Analyzer
      </h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-text-secondary mb-2">Enter your current phone to see if an upgrade is worth it:</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={currentPhone}
              onChange={(e) => setCurrentPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="e.g., Samsung Galaxy S21"
              className="flex-grow bg-input-background border border-border-color rounded-lg px-4 py-2 text-text-primary placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              disabled={isLoading}
            />
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !currentPhone}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              aria-label="Analyze upgrade worthiness"
            >
              <SparklesIcon className="w-5 h-5" />
              Analyze
            </button>
          </div>
        </div>
        
        {isLoading && (
            <div className="text-center pt-4 text-text-secondary animate-pulse">
                AI is analyzing your upgrade path...
            </div>
        )}
        {error && !isLoading && (
            <div className="text-center p-3 bg-red-500/10 text-red-400 rounded-lg">{error}</div>
        )}
        {results && !isLoading && !error && (
            <div className="pt-4 mt-4 border-t border-border-color animate-fade-in">
                 <div 
                    className="prose prose-p:text-slate-600 prose-strong:text-slate-800 prose-headings:text-slate-900 prose-li:marker:text-blue-500 dark:prose-p:text-gray-300 dark:prose-strong:text-white dark:prose-headings:text-white dark:prose-li:marker:text-blue-400"
                    dangerouslySetInnerHTML={createMarkup(results.analysis)}
                 />
            </div>
        )}
      </div>
    </div>
  );
};

export default UpgradeAnalyzer;
