
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { fetchPhoneComparison, generatePhoneImage, estimateBatteryLife, analyzeUpgradeWorthiness, ModelTier } from './services/geminiService';
import type { ComparisonResponse, BatteryEstimate, UpgradeAnalysis } from './types';
import ComparisonView from './components/ComparisonView';
import Loader from './components/Loader';
import { SparklesIcon, DevicePhoneMobileIcon, ShareIcon, TrashIcon, FireIcon, ArrowsRightLeftIcon, CheckIcon, ClockIcon, QueueListIcon, CpuChipIcon } from './components/Icons';
import BrandBrowser from './components/BrandBrowser';
import SpecBrowser from './components/SpecBrowser';
import AIFeaturesModal from './components/AIFeaturesModal';
import SavedComparisonsView from './components/SavedComparisonsView';
import ThemeToggle from './components/ThemeToggle';
import GeminiAssistant from './components/GeminiAssistant';
import confetti from 'canvas-confetti';

const HISTORY_KEY = 'nexspec_history';
const FAVORITES_KEY = 'nexspec_favorites';
const SAVED_BATTLES_KEY = 'nexspec_saved_battles';
const THEME_KEY = 'nexspec_theme';

type Theme = 'light' | 'dark';

const TRENDING = [
    ['iPhone 16 Pro Max', 'Samsung S24 Ultra'],
    ['Pixel 9 Pro', 'iPhone 16 Pro'],
    ['Nothing Phone (2)', 'OnePlus 12'],
    ['Xiaomi 14 Ultra', 'Sony Xperia 1 VI']
];

const App: React.FC = () => {
  // State
  const [phone1, setPhone1] = useState<string>('');
  const [phone2, setPhone2] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<boolean>(false);
  const [phoneImages, setPhoneImages] = useState<[string | null, string | null]>([null, null]);
  const [error, setError] = useState<string | null>(null);
  const [showShareNotification, setShowShareNotification] = useState(false);
  const [showAIFeaturesModal, setShowAIFeaturesModal] = useState(false);
  
  // Lists
  const [history, setHistory] = useState<string[][]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedBattles, setSavedBattles] = useState<string[][]>([]);
  
  // Config
  const [theme, setTheme] = useState<Theme>('dark');
  const [modelTier, setModelTier] = useState<ModelTier>('flash');
  const [activeFocus, setActiveFocus] = useState<'none' | 'input1' | 'input2'>('none');
  
  // Specific Analysis State
  const [batteryEstimates, setBatteryEstimates] = useState<BatteryEstimate | null>(null);
  const [upgradeAnalysis, setUpgradeAnalysis] = useState<UpgradeAnalysis | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // Theme Init
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);
  
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Data Init
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      const storedBattles = localStorage.getItem(SAVED_BATTLES_KEY);
      if (storedHistory) setHistory(JSON.parse(storedHistory));
      if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
      if (storedBattles) setSavedBattles(JSON.parse(storedBattles));
    } catch (e) {}
    
    // Check URL params
    const params = new URLSearchParams(window.location.search);
    const p1 = params.get('phone1');
    const p2 = params.get('phone2');
    if (p1 && p2) {
        setPhone1(p1);
        setPhone2(p2);
        handleCompare(p1, p2); // Auto-trigger
    }
  }, []);

  // Persistence
  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(SAVED_BATTLES_KEY, JSON.stringify(savedBattles)); }, [savedBattles]);

  // --- Handlers ---

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const addToHistory = useCallback((phones: [string, string]) => {
    setHistory(prev => {
        const newEntry = [phones[0], phones[1]];
        const filtered = prev.filter(p => !(p[0] === phones[0] && p[1] === phones[1]));
        return [newEntry, ...filtered].slice(0, 10);
    });
  }, []);

  const saveBattle = useCallback(() => {
    if (phone1 && phone2) {
        setSavedBattles(prev => {
             // Avoid dupes
             const exists = prev.some(p => (p[0] === phone1 && p[1] === phone2) || (p[0] === phone2 && p[1] === phone1));
             if (exists) return prev;
             return [[phone1, phone2], ...prev];
        });
    }
  }, [phone1, phone2]);

  const removeSavedBattle = useCallback((index: number) => {
      setSavedBattles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const toggleFavorite = useCallback((phoneName: string) => {
    setFavorites(prev => prev.includes(phoneName) ? prev.filter(p => p !== phoneName) : [...prev, phoneName]);
  }, []);

  const handleSwap = () => {
    setPhone1(phone2);
    setPhone2(phone1);
    if (comparisonData) {
        setComparisonData(prev => prev ? { ...prev, phone1: prev.phone2, phone2: prev.phone1 } : null);
        setPhoneImages([phoneImages[1], phoneImages[0]]);
    }
  };

  const handleShare = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('phone1', phone1);
      url.searchParams.set('phone2', phone2);
      navigator.clipboard.writeText(url.toString());
      setShowShareNotification(true);
      setTimeout(() => setShowShareNotification(false), 2000);
  };
  
  const handleCompare = useCallback(async (p1: string = phone1, p2: string = phone2) => {
    if (!p1 || !p2) {
      setError('Enter two devices to begin the analysis.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setComparisonData(null);
    setBatteryEstimates(null);
    setUpgradeAnalysis(null);
    
    // Keep images if just swapping, otherwise clear
    if (p1 !== phone2 || p2 !== phone1) {
        setPhoneImages([null, null]);
    }

    try {
      const data = await fetchPhoneComparison(p1, p2, modelTier);
      setComparisonData(data);
      addToHistory([data.phone1.name, data.phone2.name]);

      // Victory Confetti
      if (data.winner !== "It's a tie") {
          setTimeout(() => {
              confetti({ 
                  particleCount: 150, spread: 100, origin: { y: 0.6 }, 
                  colors: ['#3b82f6', '#6366f1', '#fbbf24'], disableForReducedMotion: true 
              });
          }, 500);
      }

      // Update URL
      const params = new URLSearchParams();
      params.set('phone1', p1);
      params.set('phone2', p2);
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

      // Smooth Scroll
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

      // Async Image Generation
      setIsGeneratingImages(true);
      const [image1, image2] = await Promise.all([
          generatePhoneImage(data.phone1.name, theme),
          generatePhoneImage(data.phone2.name, theme)
      ]);
      setPhoneImages([image1, image2]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
      setIsGeneratingImages(false);
    }
  }, [phone1, phone2, addToHistory, theme, modelTier]);

  // --- Render ---

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 lg:p-12 relative overflow-hidden">
      
      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      <div className="w-full max-w-7xl mx-auto z-10">
        
        {/* Header - Collapses when results are shown? No, keep it stable for identity. */}
        <header className={`text-center transition-all duration-700 ${comparisonData ? 'mb-8' : 'mb-16 mt-12'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 rounded-full mb-6 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-fade-in">
             <DevicePhoneMobileIcon className="w-4 h-4 text-blue-500" />
             <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.25em]">Gemini 3.0 Architecture</span>
          </div>
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter mb-4 bg-gradient-to-br from-slate-900 via-blue-700 to-indigo-600 dark:from-white dark:via-blue-300 dark:to-indigo-400 text-transparent bg-clip-text animate-slide-up">
            NexSpec
          </h1>
          {!comparisonData && (
              <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed animate-fade-in delay-100">
                The ultimate AI-powered device intelligence engine.
              </p>
          )}
        </header>

        {/* Main Input Area */}
        <main className="w-full">
          <div className={`glass rounded-[2rem] shadow-2xl transition-all duration-500 border border-white/20 dark:border-white/5 relative z-30 ${comparisonData ? 'p-6 mb-8 transform scale-95 opacity-90 hover:scale-100 hover:opacity-100' : 'p-8 sm:p-12 mb-16'}`}>
            
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-4 items-center mb-8">
              {/* Input 1 */}
              <div className="relative group">
                <input
                    type="text"
                    value={phone1}
                    onChange={(e) => setPhone1(e.target.value)}
                    onFocus={() => setActiveFocus('input1')}
                    onBlur={() => setActiveFocus('none')}
                    placeholder="Enter Device 1 (e.g. Pixel 9)"
                    className={`w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-5 text-xl font-bold outline-none transition-all placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 ${activeFocus === 'input1' ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                />
              </div>

              {/* Swap Button */}
              <button 
                onClick={handleSwap}
                className="hidden lg:flex items-center justify-center w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 transition-all active:scale-90 active:rotate-180"
                title="Swap"
              >
                <ArrowsRightLeftIcon className="w-5 h-5" />
              </button>

              {/* Input 2 */}
              <div className="relative group">
                <input
                    type="text"
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                    onFocus={() => setActiveFocus('input2')}
                    onBlur={() => setActiveFocus('none')}
                    placeholder="Enter Device 2 (e.g. iPhone 16)"
                    className={`w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-5 text-xl font-bold outline-none transition-all placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 ${activeFocus === 'input2' ? 'ring-2 ring-indigo-500 border-transparent' : ''} ${activeFocus === 'input1' && !phone2 ? 'ring-2 ring-blue-400/50 animate-pulse' : ''}`}
                />
              </div>
            </div>

            {/* Actions & Settings */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                <div className="relative flex-grow">
                    <button
                        onClick={() => handleCompare()}
                        disabled={isLoading || !phone1 || !phone2}
                        className={`w-full h-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-black text-lg py-5 px-8 rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] ${activeFocus === 'input2' && phone1 && phone2 ? 'ring-4 ring-blue-500/30 scale-[1.02]' : ''}`}
                    >
                        {isLoading ? 'Processing Architecture...' : 'Analyze Hardware'}
                        <SparklesIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <button
                    onClick={saveBattle}
                    disabled={!phone1 || !phone2}
                    className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 text-slate-700 dark:text-slate-300 font-bold p-5 rounded-2xl transition-all"
                    title="Add to Saved Battles"
                >
                   <QueueListIcon className="w-6 h-6" />
                </button>

                <div className="flex flex-col sm:flex-row gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
                    <button
                        onClick={() => setShowAIFeaturesModal(true)}
                        className="flex items-center justify-center gap-2 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl transition-all h-full"
                    >
                        AI Suggestions
                    </button>
                    
                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                        <select 
                            value={modelTier}
                            onChange={(e) => setModelTier(e.target.value as ModelTier)}
                            className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none px-2 py-2 cursor-pointer"
                        >
                            <option value="flash">⚡ Flash (Fast)</option>
                            <option value="pro">🧠 Pro (Reasoning)</option>
                            <option value="lite">🚀 Lite (Instant)</option>
                        </select>
                    </div>
                </div>
            </div>
            
            {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-center font-bold animate-fade-in">
                    {error}
                </div>
            )}
          </div>

          {/* LOADING STATE */}
          {isLoading && <Loader message={isGeneratingImages ? "Rendering device geometry..." : "Executing deep technical analysis..."} />}
          
          {/* RESULTS VIEW */}
          {comparisonData && (
              <div ref={resultsRef} className="animate-fade-in space-y-8 pb-32">
                
                {/* Utility Bar */}
                <div className="flex justify-between items-center px-4">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Analysis Complete</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleShare} 
                            className="flex items-center gap-2 px-4 py-2 glass rounded-xl hover:text-blue-500 transition-all font-bold text-sm"
                        >
                            {showShareNotification ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ShareIcon className="w-4 h-4"/>}
                            {showShareNotification ? 'Copied' : 'Share'}
                        </button>
                        <button 
                            onClick={() => { setComparisonData(null); setPhone1(''); setPhone2(''); }} 
                            className="p-2 glass rounded-xl hover:text-red-500 transition-all"
                            title="Clear"
                        >
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
                
                <ComparisonView 
                    data={comparisonData} 
                    phoneImages={phoneImages} 
                    isGeneratingImages={isGeneratingImages}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    onGetBatteryEstimate={async (p) => estimateBatteryLife(comparisonData.phone1, comparisonData.phone2, p)}
                    batteryEstimates={batteryEstimates}
                    onAnalyzeUpgrade={async (c) => analyzeUpgradeWorthiness(c, comparisonData.phone1, comparisonData.phone2)}
                    upgradeAnalysis={upgradeAnalysis}
                />
              </div>
          )}

          {/* LANDING CONTENT (Recents, Trending, Brands) */}
          {!isLoading && !comparisonData && (
              <div className="space-y-16 animate-fade-in delay-200">
                  
                  {/* Recents & Trending Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* Left Column: Trending & Saved */}
                      <div className="space-y-8">
                          {/* Saved Battles */}
                          <div className="bg-card-background backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-border-color h-full">
                              <SavedComparisonsView 
                                savedList={savedBattles}
                                onSelect={(phones) => { setPhone1(phones[0]); setPhone2(phones[1]); handleCompare(phones[0], phones[1]); }}
                                onRemove={removeSavedBattle}
                              />
                          </div>

                          <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                  <FireIcon className="w-5 h-5 text-orange-500" />
                                  <h3 className="text-xl font-bold">Global Trending</h3>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {TRENDING.map(([p1, p2], idx) => (
                                      <button 
                                        key={idx}
                                        onClick={() => { setPhone1(p1); setPhone2(p2); handleCompare(p1, p2); }}
                                        className="glass-hover p-4 rounded-2xl text-left border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 transition-all"
                                      >
                                          <div className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Hot Battle</div>
                                          <div className="font-bold text-sm truncate">{p1}</div>
                                          <div className="text-xs text-slate-400 font-bold my-0.5">VS</div>
                                          <div className="font-bold text-sm truncate">{p2}</div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Right Column: History & Brands */}
                      <div className="space-y-8">
                          <div className="space-y-6">
                              <div className="flex items-center gap-3">
                                  <ClockIcon className="w-5 h-5 text-blue-500" />
                                  <h3 className="text-xl font-bold">Recent Comparisons</h3>
                              </div>
                              {history.length > 0 ? (
                                  <div className="space-y-3">
                                      {history.slice(0, 3).map((phones, idx) => (
                                          <button 
                                            key={idx} 
                                            onClick={() => { setPhone1(phones[0]); setPhone2(phones[1]); handleCompare(phones[0], phones[1]); }}
                                            className="w-full flex items-center justify-between p-4 glass-hover rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 transition-all"
                                          >
                                              <div className="flex items-center gap-3 text-sm font-semibold">
                                                  <span>{phones[0]}</span>
                                                  <span className="text-slate-400 text-xs">vs</span>
                                                  <span>{phones[1]}</span>
                                              </div>
                                              <div className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                                                  <ArrowsRightLeftIcon className="w-3 h-3 text-slate-500" />
                                              </div>
                                          </button>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-sm">
                                      Your search history will appear here.
                                  </div>
                              )}
                          </div>
                          
                          <BrandBrowser onModelSelect={(m) => !phone1 ? setPhone1(m) : setPhone2(m)} />
                      </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800/50" />

                  {/* Discovery Tools */}
                  <SpecBrowser onModelSelect={(m) => !phone1 ? setPhone1(m) : setPhone2(m)} />
              </div>
          )}
        </main>
      </div>

      <GeminiAssistant />
      
      {showAIFeaturesModal && (
        <AIFeaturesModal 
            onClose={() => setShowAIFeaturesModal(false)} 
            onSelectModel={(m) => !phone1 ? setPhone1(m) : setPhone2(m)} 
        />
      )}
    </div>
  );
};

export default App;
