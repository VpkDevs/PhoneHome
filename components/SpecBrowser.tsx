import React, { useState, useCallback, useEffect } from 'react';
import { findPhonesBySpec } from '../services/geminiService';
import { SparklesIcon, XMarkIcon } from './Icons';

interface SpecBrowserProps {
  onModelSelect: (phoneName: string) => void;
}

const QUICK_SEARCHES = [
  'Best Battery Life (>5000mAh)',
  'Top Camera Phones',
  'Phones with Wireless Charging',
  'Phones with Stylus Support',
  'Waterproof (IP68 rated)',
  'Best phones under $500',
];

const SpecBrowser: React.FC<SpecBrowserProps> = ({ onModelSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery) return;

    setIsLoading(true);
    setError(null);
    setResults([]);
    setSearchedQuery(searchQuery);

    try {
      const fetchedModels = await findPhonesBySpec(searchQuery);
      setResults(fetchedModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch models.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search logic
  useEffect(() => {
    const timer = setTimeout(() => {
        if (query.length > 3 && query !== searchedQuery) {
            handleSearch(query);
        }
    }, 800); // 800ms delay

    return () => clearTimeout(timer);
  }, [query, handleSearch, searchedQuery]);

  const handleQuickSearch = (quickQuery: string) => {
    setQuery(quickQuery);
    handleSearch(quickQuery);
  };
  
  const handleModelSelect = (model: string) => {
    onModelSelect(model);
    setResults([]);
    setQuery('');
    setSearchedQuery(null);
  }

  return (
    <div className="bg-card-background backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-border-color">
      <h2 className="text-2xl font-bold text-center mb-4 text-slate-700 dark:text-gray-300">Browse by Feature or Spec</h2>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-grow">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Phones with 120Hz display"
              className="w-full bg-input-background border border-border-color rounded-lg px-4 py-2.5 pr-10 text-text-primary placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300"
            />
            {query && !isLoading && (
                <button 
                    onClick={() => { setQuery(''); setResults([]); setSearchedQuery(null); }} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Clear"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            )}
        </div>
        <button
          onClick={() => handleSearch(query)}
          disabled={isLoading || !query}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-gray-600 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex-shrink-0"
        >
          <SparklesIcon className="w-5 h-5" />
          Find
        </button>
      </div>
      
      <div className="mb-6">
        <p className="text-sm text-text-secondary mb-2 text-center sm:text-left">Quick Searches:</p>
        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
            {QUICK_SEARCHES.map(qs => (
                <button
                    key={qs}
                    onClick={() => handleQuickSearch(qs)}
                    disabled={isLoading}
                    className="text-sm bg-slate-200 hover:bg-slate-300 dark:bg-gray-700/50 dark:hover:bg-gray-700 disabled:opacity-50 text-slate-600 dark:text-gray-300 font-medium py-1.5 px-3 rounded-full transition-colors"
                >
                    {qs}
                </button>
            ))}
        </div>
      </div>

      {(isLoading || error || results.length > 0 || (searchedQuery && !isLoading && results.length === 0)) && (
        <div className="mt-4 p-4 bg-slate-200/50 dark:bg-gray-900/50 rounded-lg animate-fade-in">
          {isLoading && <p className="text-center text-slate-500 dark:text-gray-400">AI is searching for phones...</p>}
          {error && <p className="text-center text-red-400">{error}</p>}
          {!isLoading && !error && results.length > 0 && (
            <>
              <h3 className="text-xl font-bold mb-4 text-text-primary">Results for "{searchedQuery}"</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2">
                {results.map(model => (
                  <button
                    key={model}
                    onClick={() => handleModelSelect(model)}
                    className="text-left w-full p-3 bg-slate-300/50 dark:bg-gray-800 hover:bg-blue-600 hover:text-white text-text-primary rounded-md transition-colors duration-200"
                  >
                    {model}
                  </button>
                ))}
              </div>
            </>
          )}
          {!isLoading && !error && results.length === 0 && searchedQuery && (
            <p className="text-center text-slate-500 dark:text-gray-500">No models found for "{searchedQuery}".</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SpecBrowser;