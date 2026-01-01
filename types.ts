
export interface PhoneData {
  name: string;
  release_date: string;
  price: string;
  specs: {
    [key: string]: string;
  };
}

export interface ComparisonResponse {
  phone1: PhoneData;
  phone2: PhoneData;
  summary: string;
  winner: string;
  spec_winners: { [key:string]: string };
  spec_order: string[];
}

export interface PhoneModelsApiResponse {
  models: string[];
}

export interface AIRecommendation {
    recommendations: {
        name: string;
        reason: string;
    }[];
    summary: string;
}

export interface BatteryEstimate {
    phone1_estimate: string;
    phone2_estimate: string;
    explanation: string;
    error?: string;
}

export interface UpgradeAnalysis {
    analysis: string;
    error?: string;
}

export interface BuyingOption {
    source: 'online' | 'local';
    title: string;
    uri: string;
    price?: string;
}

export interface BuyingGuideData {
    online_options: BuyingOption[];
    local_options: BuyingOption[];
    summary: string;
}

// --- Agent Types ---

export type MessageRole = 'user' | 'model' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'tool_response';
  mediaUrl?: string; // For images/videos generated or uploaded
  audioData?: string; // Base64 for audio
  isThinking?: boolean; // If true, show thinking animation
  timestamp: number;
  toolCalls?: any[];
  groundingMetadata?: any;
}

export interface AgentConfig {
  modelLevel: 'standard' | 'high_reasoning' | 'fast'; // standard=flash, high=pro, fast=flash-lite
  thinkingMode: boolean; // Enables thinking budget on Pro
  useSearch: boolean;
}