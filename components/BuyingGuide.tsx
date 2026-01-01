
import React, { useState } from 'react';
import { fetchBuyingInfo } from '../services/geminiService';
import type { BuyingGuideData } from '../types';
import { SparklesIcon, XMarkIcon } from './Icons';

interface BuyingGuideProps {
  phone1: string;
  phone2: string;
}

// Shopping Bag Icon
const ShoppingBagIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);

const BuyingGuide: React.FC<BuyingGuideProps> = ({ phone1, phone2 }) => {
    const [data, setData] = useState<BuyingGuideData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [locError, setLocError] = useState<string | null>(null);

    const handleFetch = async () => {
        setIsLoading(true);
        setLocError(null);
        
        let location: {lat: number, lng: number} | undefined;

        try {
            // Attempt to get location
            const pos: GeolocationPosition = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) reject(new Error("Geolocation not supported"));
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            location = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
        } catch (e) {
            console.warn("Location access denied or failed", e);
            setLocError("Location denied. Showing general US results.");
        }

        try {
            const result = await fetchBuyingInfo(phone1, phone2, location);
            setData(result);
            setIsOpen(true);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isOpen && data) {
        return (
            <div className="bg-card-background backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-border-color mt-8 relative animate-fade-in">
                <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-1 rounded-full text-text-secondary hover:bg-slate-200 dark:hover:bg-gray-700">
                    <XMarkIcon className="w-5 h-5" />
                </button>
                <h3 className="text-2xl font-bold text-text-primary mb-2 flex items-center gap-2">
                    <ShoppingBagIcon className="w-6 h-6 text-green-600" />
                    Where to Buy
                </h3>
                {locError && <p className="text-xs text-orange-500 mb-2">{locError}</p>}
                <p className="text-text-secondary mb-6">{data.summary}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-100 dark:bg-gray-800/50 p-4 rounded-xl">
                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">🌐 Online Deals (Search)</h4>
                        <ul className="space-y-3">
                            {data.online_options.map((opt, i) => (
                                <li key={i} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                                    <div className="truncate pr-2">
                                        <span className="font-medium">{opt.title}</span>
                                        {opt.price && <span className="block text-sm text-green-600 font-bold">{opt.price}</span>}
                                    </div>
                                    <a href={opt.uri} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 text-sm font-semibold shrink-0">View</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                     <div className="bg-slate-100 dark:bg-gray-800/50 p-4 rounded-xl">
                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">📍 Local Stores (Maps)</h4>
                        <ul className="space-y-3">
                            {data.local_options.map((opt, i) => (
                                <li key={i} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                                    <span className="font-medium truncate pr-2">{opt.title}</span>
                                    <a href={opt.uri} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 text-sm font-semibold shrink-0">Directions</a>
                                </li>
                            ))}
                            {data.local_options.length === 0 && (
                                <li className="text-sm text-slate-500 italic">No local stores found nearby.</li>
                            )}
                        </ul>
                    </div>
                </div>
                <div className="mt-4 text-xs text-center text-text-secondary">
                    Pricing and availability subject to change. Grounded by Google Search & Maps.
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center mt-8">
            <button
                onClick={handleFetch}
                disabled={isLoading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
            >
                {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                ) : (
                    <ShoppingBagIcon className="w-5 h-5" />
                )}
                {isLoading ? 'Checking Stock...' : 'Find Buying Options'}
            </button>
        </div>
    );
};

export default BuyingGuide;
