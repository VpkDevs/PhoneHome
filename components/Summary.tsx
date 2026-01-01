
import React, { useState, useRef } from 'react';
import { marked } from 'marked';
import { CheckBadgeIcon, SpeakerWaveIcon } from './Icons';
import { synthesizeSpeech } from '../services/geminiService';

interface SummaryProps {
  summary: string;
  winner: string;
}

const createMarkup = (markdownText: string) => {
    const rawMarkup = marked(markdownText, { breaks: true, gfm: true });
    return { __html: rawMarkup };
};

const Summary: React.FC<SummaryProps> = ({ summary, winner }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handlePlaySummary = async () => {
    if (isPlaying) {
        if (audioSourceRef.current) {
            try { audioSourceRef.current.stop(); } catch (e) {}
            audioSourceRef.current = null;
        }
        setIsPlaying(false);
        return;
    }

    setIsLoading(true);
    try {
        const audioBuffer = await synthesizeSpeech(summary);
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = await ctx.decodeAudioData(audioBuffer);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        audioSourceRef.current = source;
        setIsPlaying(true);
        source.onended = () => {
             setIsPlaying(false);
             audioSourceRef.current = null;
        };
    } catch (e) {
        console.error("TTS Error", e);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="glass h-full p-8 rounded-[2.5rem] relative flex flex-col border border-white/20 dark:border-white/5">
      <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">Expert Analysis</h2>
          <button 
            onClick={handlePlaySummary}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-xs font-bold uppercase tracking-wider ${isPlaying ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20'}`}
          >
            {isLoading ? (
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>
            ) : (
                <SpeakerWaveIcon className={`w-3 h-3 ${isPlaying ? 'animate-pulse' : ''}`} />
            )}
            {isLoading ? 'Loading' : isPlaying ? 'Stop' : 'Listen'}
          </button>
      </div>
      
      <div 
        className="prose prose-sm prose-p:text-slate-600 prose-strong:text-slate-900 prose-headings:text-slate-900 dark:prose-p:text-slate-300 dark:prose-strong:text-white dark:prose-headings:text-white max-w-none flex-grow"
        dangerouslySetInnerHTML={createMarkup(summary)}
      />
    </div>
  );
};

export default Summary;
