
import React, { useState } from 'react';
import { fetchPhoneModelsByBrand } from '../services/geminiService';

interface BrandBrowserProps {
  onModelSelect: (phoneName: string) => void;
}

const BRANDS = [
  'Apple', 'Asus', 'Google', 'Huawei', 'Motorola', 'Nothing', 'OnePlus', 'Samsung', 'Sony', 'Xiaomi'
].sort();

const BrandBrowser: React.FC<BrandBrowserProps> = ({ onModelSelect }) => {
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const handleBrandClick = async (brand: string) => {
    if (activeBrand === brand) {
      setActiveBrand(null);
      return;
    }

    setActiveBrand(brand);
    setIsLoading(true);
    setError(null);
    setModels([]);
    setFilter('');

    try {
      const fetchedModels = await fetchPhoneModelsByBrand(brand);
      setModels(fetchedModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch models.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleModelSelect = (model: string) => {
    onModelSelect(model);
    setActiveBrand(null);
  }
  
  const filteredModels = models.filter(model => model.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="bg-card-background backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-border-color">
        <h2 className="text-2xl font-bold text-center mb-6 text-slate-700 dark:text-gray-300">Browse Phones by Brand</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {BRANDS.map(brand => (
                <button
                    key={brand}
                    onClick={() => handleBrandClick(brand)}
                    className={`p-4 rounded-lg font-semibold text-white transition-all duration-300 flex justify-center items-center h-full text-center ${activeBrand === brand ? 'bg-blue-600' : 'bg-slate-300 dark:bg-gray-700/50 hover:bg-slate-400/80 dark:hover:bg-gray-700 text-slate-800 dark:text-white'}`}
                >
                    {brand}
                </button>
            ))}
        </div>
        
        {activeBrand && (
            <div className="mt-6 p-4 bg-slate-200/50 dark:bg-gray-900/50 rounded-lg animate-fade-in">
                {isLoading && <p className="text-center text-slate-500 dark:text-gray-400">Loading {activeBrand} models...</p>}
                {error && <p className="text-center text-red-400">{error}</p>}
                {!isLoading && !error && models.length > 0 && (
                    <>
                        <h3 className="text-xl font-bold mb-4 text-text-primary">Select a {activeBrand} Model</h3>
                        <input
                          type="text"
                          placeholder="Filter models..."
                          value={filter}
                          onChange={e => setFilter(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-gray-800 border border-border-color rounded-lg px-3 py-2 mb-3 text-text-primary placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2">
                            {filteredModels.map(model => (
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
                 {!isLoading && !error && filteredModels.length === 0 && activeBrand && (
                    <p className="text-center text-slate-500 dark:text-gray-500">No models found for {activeBrand}.</p>
                 )}
            </div>
        )}
    </div>
  );
};

export default BrandBrowser;
