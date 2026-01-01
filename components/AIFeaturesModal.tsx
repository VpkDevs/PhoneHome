
import React, { useState } from 'react';
import { getPhoneRecommendations } from '../services/geminiService';
import type { AIRecommendation } from '../types';
import { SparklesIcon, XMarkIcon } from './Icons';
import Loader from './Loader';
import { marked } from 'marked';

interface AIFeaturesModalProps {
  onClose: () => void;
  onSelectModel: (modelName: string) => void;
}

const createMarkup = (markdownText: string) => {
    const rawMarkup = marked(markdownText, { breaks: true, gfm: true });
    return { __html: rawMarkup };
};

const AIFeaturesModal: React.FC<AIFeaturesModalProps> = ({ onClose, onSelectModel }) => {
  const [prompt, setPrompt] = useState('');
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGetRecommendations = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setError(null);
    setRecommendation(null);
    try {
      const result = await getPhoneRecommendations(prompt);
      setRecommendation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (modelName: string) => {
    onSelectModel(modelName);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-background border border-border-color rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-border-color">
          <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
            <SparklesIcon className="w-6 h-6 text-indigo-500" />
            AI Phone Recommender
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-slate-200 dark:hover:bg-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
            <p className="text-text-secondary">Describe what you're looking for in a phone, and our AI will suggest some options for you.</p>
            <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g., I need a phone with a great camera for under $800, and good battery life."
                className="w-full h-24 bg-input-background border border-border-color rounded-lg px-4 py-3 text-text-primary placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300"
                disabled={isLoading}
            />
            <button
                onClick={handleGetRecommendations}
                disabled={isLoading || !prompt}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                {isLoading ? 'Thinking...' : 'Get Recommendations'}
                <SparklesIcon className="w-5 h-5" />
            </button>
            
            {isLoading && <Loader message="Finding the best phones for you..." />}
            {error && <div className="text-center p-4 bg-red-500/10 text-red-400 rounded-lg">{error}</div>}
            
            {recommendation && (
                <div className="space-y-4 animate-fade-in">
                    <div className="prose" dangerouslySetInnerHTML={createMarkup(recommendation.summary)} />
                    <div className="space-y-3">
                        {recommendation.recommendations.map(rec => (
                            <div key={rec.name} className="bg-slate-100 dark:bg-gray-900/50 p-4 rounded-lg border border-border-color">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h4 className="font-bold text-text-primary">{rec.name}</h4>
                                        <p className="text-sm text-text-secondary">{rec.reason}</p>
                                    </div>
                                    <button
                                        onClick={() => handleSelect(rec.name)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1 px-3 rounded-md transition-colors flex-shrink-0"
                                    >
                                        Select
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AIFeaturesModal;
