
import React, { useState, useRef, useEffect } from 'react';
import { 
    agentChat, 
    generateAgentImage, 
    generateAgentVideo, 
    editAgentImage, 
    searchGoogle, 
    searchMaps,
    connectLiveAPI,
    synthesizeSpeech
} from '../services/geminiService';
import { 
    SparklesIcon, 
    XMarkIcon,
    SpeakerWaveIcon
} from './Icons';
import { marked } from 'marked';

// ... (MicIcon, BoltIcon, BrainIcon, PaperClipIcon stay same, included below for completeness if needed, but assuming standard icons)
// Re-declaring icons to be safe within the file
const MicIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
);
const BrainIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
);
const PaperClipIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
  </svg>
);

interface Message {
    id: string;
    role: 'user' | 'model';
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    isLoading?: boolean;
    isThinking?: boolean;
}

const ACTION_CHIPS = [
    "Compare cameras",
    "Gaming performance?",
    "Display tech explained",
    "Find cases online",
    "Generate photo"
];

const GeminiAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: 'Hi! I\'m NexSpec AI. I can compare devices, create visuals, or search the web for you.' }
    ]);
    const [input, setInput] = useState('');
    const [attachment, setAttachment] = useState<{data: string, mimeType: string} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const [thinkingMode, setThinkingMode] = useState(false);
    const [liveMode, setLiveMode] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const liveSessionRef = useRef<any>(null);
    const audioInputContextRef = useRef<AudioContext>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isOpen]);

    const handleSendMessage = async (textOverride?: string) => {
        const finalInput = textOverride || input;
        if ((!finalInput && !attachment) || isLoading) return;

        const userMsg: Message = { 
            id: Date.now().toString(), 
            role: 'user', 
            text: finalInput,
            mediaUrl: attachment ? `data:${attachment.mimeType};base64,${attachment.data}` : undefined,
            mediaType: attachment?.mimeType.startsWith('image') ? 'image' : undefined
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        const currentAttachment = attachment;
        setAttachment(null);
        setIsLoading(true);

        const loadingId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: loadingId, role: 'model', isLoading: true, isThinking: thinkingMode }]);

        try {
            const response = await agentChat(
                messages,
                userMsg.text || (userMsg.mediaUrl ? "Look at this attachment" : ""),
                currentAttachment ? [currentAttachment] : [],
                { thinking: thinkingMode, fast: false }
            );

            const toolCalls = response.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall);
            
            if (toolCalls && toolCalls.length > 0) {
                setMessages(prev => prev.filter(m => m.id !== loadingId));

                for (const part of toolCalls) {
                    const call = part.functionCall;
                    const args = call.args;
                    let resultMsg: Message = { id: Date.now().toString(), role: 'model' };

                    // ... (Tool handling logic same as before but cleaner text updates)
                     if (call.name === 'generate_image') {
                        resultMsg.text = `Creating visual: ${args.prompt}`;
                        setMessages(prev => [...prev, { ...resultMsg, isLoading: true }]);
                        const imgUrl = await generateAgentImage(args.prompt, args.size, args.aspectRatio);
                        setMessages(prev => prev.map(m => m.id === resultMsg.id ? { ...m, isLoading: false, text: `Generated: ${args.prompt}`, mediaUrl: imgUrl, mediaType: 'image' } : m));
                    } 
                    else if (call.name === 'generate_video') {
                         resultMsg.text = `Rendering video: ${args.prompt}`;
                         setMessages(prev => [...prev, { ...resultMsg, isLoading: true }]);
                         const base64Img = currentAttachment?.mimeType.startsWith('image') ? currentAttachment.data : undefined;
                         const vidUrl = await generateAgentVideo(args.prompt, args.aspectRatio, base64Img);
                         setMessages(prev => prev.map(m => m.id === resultMsg.id ? { ...m, isLoading: false, text: `Video ready: ${args.prompt}`, mediaUrl: vidUrl, mediaType: 'video' } : m));
                    }
                    else if (call.name === 'edit_image') {
                        if (!currentAttachment) {
                             setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Please attach an image first." }]);
                             continue;
                        }
                        resultMsg.text = `Editing image...`;
                        setMessages(prev => [...prev, { ...resultMsg, isLoading: true }]);
                        const imgUrl = await editAgentImage(args.prompt, currentAttachment.data);
                        setMessages(prev => prev.map(m => m.id === resultMsg.id ? { ...m, isLoading: false, text: "Here is the result.", mediaUrl: imgUrl, mediaType: 'image' } : m));
                    }
                    else if (call.name === 'search_google') {
                        setMessages(prev => [...prev, { ...resultMsg, isLoading: true, text: `Searching: ${args.query}` }]);
                        const searchResult = await searchGoogle(args.query);
                         setMessages(prev => prev.map(m => m.id === resultMsg.id ? { ...m, isLoading: false, text: searchResult } : m));
                    }
                    else if (call.name === 'search_maps') {
                         setMessages(prev => [...prev, { ...resultMsg, isLoading: true, text: `Locating: ${args.query}` }]);
                        const searchResult = await searchMaps(args.query);
                         setMessages(prev => prev.map(m => m.id === resultMsg.id ? { ...m, isLoading: false, text: searchResult } : m));
                    }
                }
            } else {
                const text = response.text || "I'm not sure how to respond.";
                setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, isLoading: false, isThinking: false, text: text } : m));
            }
        } catch (err: any) {
            console.error(err);
            setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, isLoading: false, isThinking: false, text: "System overload. Please try again." } : m));
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const base64Data = base64String.split(',')[1];
                setAttachment({ data: base64Data, mimeType: file.type });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMicClick = async () => {
        if (liveMode) {
             if (audioInputContextRef.current) audioInputContextRef.current.close();
             setLiveMode(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setLiveMode(true);
                setIsOpen(true);
                
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioContext = new AudioContextClass({ sampleRate: 16000 });
                audioInputContextRef.current = audioContext;

                const source = audioContext.createMediaStreamSource(stream);
                const processor = audioContext.createScriptProcessor(4096, 1, 1);
                
                const sessionPromise = connectLiveAPI(
                    () => {},
                    () => setLiveMode(false)
                );
                
                liveSessionRef.current = sessionPromise;

                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Conversion logic same as before
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }
                    const uint8 = new Uint8Array(pcmData.buffer);
                    let binary = '';
                    const len = uint8.byteLength;
                    for (let i = 0; i < len; i++) { binary += String.fromCharCode(uint8[i]); }
                    const b64 = btoa(binary);

                    sessionPromise.then(session => {
                        session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: b64 } });
                    });
                };

                source.connect(processor);
                processor.connect(audioContext.destination);

            } catch (err) {
                setLiveMode(false);
                alert("Microphone access denied.");
            }
        }
    };
    
    const playTTS = async (text: string) => {
        try {
            const audioBuffer = await synthesizeSpeech(text);
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const buffer = await ctx.decodeAudioData(audioBuffer);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        } catch (e) { console.error(e); }
    };

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 group border border-white/20"
                title="Open NexSpec AI"
            >
                <SparklesIcon className="w-6 h-6 animate-pulse" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                        
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${liveMode ? 'bg-red-500 animate-pulse' : 'bg-slate-900 dark:bg-white'}`}>
                                    <SparklesIcon className={`w-5 h-5 ${liveMode ? 'text-white' : 'text-white dark:text-black'}`} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg text-slate-900 dark:text-white leading-none">
                                        NexSpec AI
                                    </h2>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {liveMode ? 'Live Session' : thinkingMode ? 'Reasoning Model' : 'Standard Model'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setThinkingMode(!thinkingMode)}
                                    className={`p-2 rounded-lg transition-all ${thinkingMode ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                    title="Toggle Thinking Mode"
                                >
                                    <BrainIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <XMarkIcon className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-black/20">
                            {liveMode ? (
                                <div className="h-full flex flex-col items-center justify-center space-y-8 animate-fade-in">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-red-500/20 blur-[60px] rounded-full animate-pulse" />
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-2xl relative z-10">
                                            <MicIcon className="w-10 h-10 text-white" />
                                        </div>
                                    </div>
                                    <p className="text-xl font-bold">Listening...</p>
                                    <button onClick={handleMicClick} className="px-8 py-3 bg-slate-200 dark:bg-slate-800 rounded-full font-bold text-sm">
                                        End Session
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                                                msg.role === 'user' 
                                                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm text-slate-800 dark:text-slate-100'
                                            }`}>
                                                {msg.isLoading ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-75" />
                                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-150" />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {msg.mediaUrl && (
                                                            <div className="rounded-xl overflow-hidden border border-black/5">
                                                                {msg.mediaType === 'video' ? (
                                                                    <video src={msg.mediaUrl} controls className="w-full h-auto" />
                                                                ) : (
                                                                    <img src={msg.mediaUrl} alt="AI" className="w-full h-auto" />
                                                                )}
                                                            </div>
                                                        )}
                                                        {msg.text && (
                                                            <div 
                                                                className={`prose prose-sm ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'} max-w-none`}
                                                                dangerouslySetInnerHTML={{ __html: marked(msg.text) as string }} 
                                                            />
                                                        )}
                                                        {msg.role === 'model' && msg.text && (
                                                            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                                                <button onClick={() => playTTS(msg.text!)} className="opacity-50 hover:opacity-100 transition-opacity">
                                                                    <SpeakerWaveIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {!liveMode && (
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {ACTION_CHIPS.map(chip => (
                                        <button 
                                            key={chip}
                                            onClick={() => handleSendMessage(chip)}
                                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-3 text-slate-400 hover:text-blue-500 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all relative"
                                    >
                                        <PaperClipIcon className="w-5 h-5" />
                                        {attachment && <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />}
                                    </button>
                                    <div className="flex-grow">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Ask NexSpec..."
                                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleSendMessage()}
                                        disabled={!input && !attachment}
                                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
                                    >
                                        <SparklesIcon className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={handleMicClick}
                                        className="p-3 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl hover:bg-red-100 transition-all"
                                    >
                                        <MicIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default GeminiAssistant;
