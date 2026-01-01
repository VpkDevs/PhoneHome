
import React, { useState, useMemo } from 'react';
import type { ComparisonResponse, BatteryEstimate, UpgradeAnalysis } from '../types';
import PhoneCard from './PhoneCard';
import Summary from './Summary';
import SpecBar from './SpecBar';
import BatteryEstimator from './BatteryEstimator';
import UpgradeAnalyzer from './UpgradeAnalyzer';
import BuyingGuide from './BuyingGuide';
import { generateCinematicVideo } from '../services/geminiService';
import { SparklesIcon, CheckIcon, SpeakerWaveIcon } from './Icons';

interface ComparisonViewProps {
  data: ComparisonResponse;
  phoneImages: [string | null, string | null];
  isGeneratingImages: boolean;
  favorites: string[];
  onToggleFavorite: (name: string) => void;
  onGetBatteryEstimate: (profile: string) => Promise<BatteryEstimate | null>;
  batteryEstimates: BatteryEstimate | null;
  onAnalyzeUpgrade: (currentPhone: string) => Promise<UpgradeAnalysis | null>;
  upgradeAnalysis: UpgradeAnalysis | null;
}

const parseSpecValue = (spec: string): { value: number, unit: string } | null => {
    if (!spec || typeof spec !== 'string') return null;
    const match = spec.replace(/,/g, '').match(/^(-?[\d.]+)\s*([a-zA-Z%°µmahzgb/]+)?/i);
    return match ? { value: parseFloat(match[1]), unit: match[2] || '' } : null;
};

const ComparisonView: React.FC<ComparisonViewProps> = ({ data, phoneImages, isGeneratingImages, favorites, onToggleFavorite, onGetBatteryEstimate, batteryEstimates, onAnalyzeUpgrade, upgradeAnalysis }) => {
  const { phone1, phone2, summary, winner, spec_order, spec_winners } = data;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const stats = useMemo(() => {
    const winnersList = Object.values(spec_winners) as string[];
    const p1Wins = winnersList.filter(w => w.toLowerCase() === phone1.name.toLowerCase()).length;
    const p2Wins = winnersList.filter(w => w.toLowerCase() === phone2.name.toLowerCase()).length;
    return { p1Wins, p2Wins };
  }, [spec_winners, phone1.name, phone2.name]);

  const winningPhone = winner.includes(phone1.name) ? phone1.name : (winner.includes(phone2.name) ? phone2.name : null);

  return (
    <div className="space-y-12">
      
      {/* SECTION 1: THE VERDICT (Golden Path Entry) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Winner Card */}
          <div className="lg:col-span-5 glass p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-center min-h-[400px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-[60px] rounded-full pointer-events-none" />
              
              <div className="relative z-10">
                  <h4 className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-4">NexSpec Verdict</h4>
                  <h2 className="text-5xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                    {winner === "It's a tie" ? "It's a Draw" : winner}
                  </h2>
                  <div className="flex items-center gap-2 mb-8">
                    <span className="bg-yellow-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3" /> Superior Choice
                    </span>
                  </div>

                  {/* Mini Win Stats */}
                  <div className="space-y-3 p-4 bg-white/50 dark:bg-black/20 rounded-2xl backdrop-blur-md border border-white/10">
                      <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500">{phone1.name}</span>
                          <span className="font-black text-blue-500">{stats.p1Wins} Wins</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(stats.p1Wins / (stats.p1Wins + stats.p2Wins)) * 100}%` }} />
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500">{phone2.name}</span>
                          <span className="font-black text-indigo-500">{stats.p2Wins} Wins</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Analysis Text */}
          <div className="lg:col-span-7">
              <Summary summary={summary} winner={winner} />
          </div>
      </div>

      {/* SECTION 2: VISUALS (The Eye Candy) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <PhoneCard 
            name={phone1.name} 
            subtitle={`${phone1.release_date || ''} • ${phone1.price || ''}`}
            imageUrl={phoneImages[0]} 
            isLoading={isGeneratingImages} 
            isFavorite={favorites.includes(phone1.name)} 
            onToggleFavorite={onToggleFavorite} 
            isWinner={winningPhone === phone1.name}
        />
        <PhoneCard 
            name={phone2.name} 
            subtitle={`${phone2.release_date || ''} • ${phone2.price || ''}`}
            imageUrl={phoneImages[1]} 
            isLoading={isGeneratingImages} 
            isFavorite={favorites.includes(phone2.name)} 
            onToggleFavorite={onToggleFavorite}
            isWinner={winningPhone === phone2.name}
        />
      </div>

      {/* SECTION 3: DEEP DIVE SPECS */}
      <div className="glass rounded-[2.5rem] overflow-hidden shadow-xl border border-white/20 dark:border-white/5">
        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6 bg-slate-50/30 dark:bg-slate-900/30">
            <div>
                <h3 className="text-2xl font-black tracking-tight mb-1">Architecture Breakdown</h3>
                <p className="text-slate-500 text-sm font-medium">Detailed hardware specification comparison.</p>
            </div>
            
            <button 
                onClick={async () => {
                    setIsVideoLoading(true);
                    try {
                        const target = winner === "It's a tie" ? phone1.name : winner;
                        setVideoUrl(await generateCinematicVideo(target));
                    } catch(e) { alert("Video generation failed."); }
                    setIsVideoLoading(false);
                }} 
                className="group relative flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
                {isVideoLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    <SpeakerWaveIcon className="w-4 h-4" />
                )}
                {isVideoLoading ? 'Rendering...' : 'Generate 3D Trailer'}
                {!isVideoLoading && <div className="absolute -top-1 -right-1 bg-blue-500 text-[9px] text-white px-1.5 py-0.5 rounded-full">AI</div>}
            </button>
        </div>
        
        {videoUrl && (
            <div className="p-8 bg-black">
                <video src={videoUrl} controls autoPlay className="w-full aspect-video rounded-2xl shadow-2xl border border-white/10" />
            </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/40 dark:bg-slate-900/40">
                <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Spec</th>
                <th className="p-6 font-black text-lg">{phone1.name}</th>
                <th className="p-6 font-black text-lg">{phone2.name}</th>
              </tr>
            </thead>
            <tbody>
              {spec_order.map((key) => {
                const val1 = parseSpecValue(phone1.specs[key]);
                const val2 = parseSpecValue(phone2.specs[key]);
                const isComparable = val1 && val2 && val1.unit.toLowerCase() === val2.unit.toLowerCase();
                const maxValue = isComparable ? Math.max(val1.value, val2.value) : 0;
                const winnerName = spec_winners[key];

                return (
                  <tr key={key} className="border-t border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                    <td className="p-6 font-bold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors w-1/4">{key}</td>
                    <td className="p-6 relative w-1/3">
                      {isComparable && <SpecBar value={val1.value} maxValue={maxValue} isWinner={winnerName === phone1.name} />}
                      <div className={`relative flex items-center gap-2 font-bold transition-all ${winnerName === phone1.name ? 'text-blue-600 dark:text-blue-400 translate-x-2' : 'opacity-80'}`}>
                          {phone1.specs[key]}
                          {winnerName === phone1.name && <CheckIcon className="w-4 h-4" />}
                      </div>
                    </td>
                    <td className="p-6 relative w-1/3">
                      {isComparable && <SpecBar value={val2.value} maxValue={maxValue} isWinner={winnerName === phone2.name} />}
                      <div className={`relative flex items-center gap-2 font-bold transition-all ${winnerName === phone2.name ? 'text-indigo-600 dark:text-indigo-400 translate-x-2' : 'opacity-80'}`}>
                          {phone2.specs[key]}
                          {winnerName === phone2.name && <CheckIcon className="w-4 h-4" />}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: INTELLIGENT TOOLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BatteryEstimator onGetEstimate={onGetBatteryEstimate} results={batteryEstimates} />
          <UpgradeAnalyzer onAnalyze={onAnalyzeUpgrade} results={upgradeAnalysis} />
      </div>

      <BuyingGuide phone1={phone1.name} phone2={phone2.name} />
    </div>
  );
};

export default ComparisonView;
