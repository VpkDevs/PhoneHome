
import { GoogleGenAI, Type, Modality, FunctionDeclaration } from "@google/genai";
import type { ComparisonResponse, PhoneModelsApiResponse, AIRecommendation, PhoneData, BatteryEstimate, UpgradeAnalysis, BuyingGuideData, BuyingOption } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Session storage cache for comparisons
const CACHE_PREFIX = 'phone_comp_';

export type ModelTier = 'flash' | 'pro' | 'lite';

// --- Existing Comparison Logic ---

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    validation: {
        type: Type.OBJECT,
        properties: {
            isValid: { type: Type.BOOLEAN, description: "Set to false if any of the phone names are unrecognized or invalid." },
            errorMessage: { type: Type.STRING, description: "If isValid is false, provide a user-friendly error message explaining which phone name is problematic. Otherwise, this should be an empty string." }
        },
        required: ["isValid", "errorMessage"]
    },
    phone1: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        release_date: { type: Type.STRING, description: "The release month and year (e.g., 'Oct 2023')." },
        price: { type: Type.STRING, description: "The approximate launch price in USD (e.g., '$999')." },
        specs: { type: Type.OBJECT, description: "Key-value pairs of the phone's specifications. For numerical values like battery, screen size, and RAM, include the unit (e.g., '5000 mAh', '6.7 inches', '12 GB')." },
      },
      required: ["name", "specs", "release_date", "price"]
    },
    phone2: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        release_date: { type: Type.STRING, description: "The release month and year (e.g., 'Sep 2023')." },
        price: { type: Type.STRING, description: "The approximate launch price in USD (e.g., '$1199')." },
        specs: { type: Type.OBJECT, description: "Key-value pairs of the phone's specifications. For numerical values like battery, screen size, and RAM, include the unit (e.g., '5000 mAh', '6.7 inches', '12 GB')." },
      },
      required: ["name", "specs", "release_date", "price"]
    },
    summary: {
      type: Type.STRING,
      description: "A detailed but concise expert summary comparing the two phones, highlighting key strengths and weaknesses. Written in markdown format."
    },
    winner: {
        type: Type.STRING,
        description: "The name of the phone that is considered the overall winner or better choice based on the comparison. If it's a tie, state 'It's a tie'."
    },
    spec_order: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "An array of spec names in the recommended order of importance for comparison. Must include all and only the keys from the specs objects."
    },
    spec_winners: {
      type: Type.OBJECT,
      description: "An object where keys are the spec names and values are the name of the winning phone for that spec, or 'tie'. Keys must match those in the specs objects."
    }
  },
  required: ["validation", "phone1", "phone2", "summary", "winner", "spec_order", "spec_winners"],
};

export const fetchPhoneComparison = async (phone1Name: string, phone2Name: string, modelTier: ModelTier = 'flash'): Promise<ComparisonResponse> => {
  // Check Cache first - Include tier in cache key to allow re-fetching with better models
  const cacheKey = CACHE_PREFIX + modelTier + '_' + [phone1Name.toLowerCase(), phone2Name.toLowerCase()].sort().join('_vs_');
  
  try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
          return JSON.parse(cached) as ComparisonResponse;
      }
  } catch (e) {
      console.warn("Failed to access sessionStorage", e);
  }

  const prompt = `
    Act as a smartphone tech expert. Provide a detailed, side-by-side comparison for the following two phones: "${phone1Name}" and "${phone2Name}".
    
    First, validate the phone names. If either is not a real, recognizable phone model, set validation.isValid to false and provide a helpful error message in validation.errorMessage.
    
    If the names are valid:
    1.  Set validation.isValid to true and validation.errorMessage to an empty string.
    2.  Ensure the phone names in the response are the full, correct model names.
    3.  Identify the Release Date and Launch Price for both.
    4.  Dynamically select 10-12 of the most important specifications. For numerical values (e.g., Battery, RAM, Screen Size, Weight, Storage), ensure the response includes the unit and is machine-readable (e.g., "5000 mAh", "12 GB", "6.7 inches", "221 g"). If a spec isn't available, use "N/A".
    5.  Provide a 'spec_order' array listing the chosen spec names in a logical order for comparison.
    6.  Populate 'spec_winners' for each specification.
    7.  Write an insightful 'summary' in markdown.
    8.  Declare a 'winner'.
    9.  Ensure perfect consistency: the keys for specs, spec_winners, and the items in spec_order must all be identical.
  `;

  // Select Model
  let modelName = 'gemini-2.5-flash';
  let config: any = {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.2,
  };

  if (modelTier === 'pro') {
      modelName = 'gemini-3-pro-preview';
      config.thinkingConfig = { thinkingBudget: 16384 }; // Use thinking for deep comparison
  } else if (modelTier === 'lite') {
      modelName = 'gemini-2.5-flash-lite';
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: config,
  });

  const jsonText = response.text.trim();
  
  try {
    const data = JSON.parse(jsonText);
    if (data.validation && !data.validation.isValid) {
        throw new Error(data.validation.errorMessage || 'One of the provided phone models could not be recognized. Please check the names and try again.');
    }
    // Cache the successful result
    try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (e) {
        console.warn("Failed to save to sessionStorage", e);
    }
    return data as ComparisonResponse;
  } catch (error) {
    if (error instanceof Error && error.message.includes('could not be recognized')) {
        throw error;
    }
    console.error("Failed to parse JSON response:", jsonText, error);
    throw new Error("The AI returned an invalid response format.");
  }
};


export const generatePhoneImage = async (phoneName: string, theme: 'light' | 'dark'): Promise<string> => {
    // Check if we have a cached image URL in session storage to avoid re-generation on reload
    // In a real app we'd use a more robust image store
    const cacheKey = `img_gen_${phoneName}_${theme}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;

    const background = theme === 'dark' 
        ? "a clean, minimalist, dark-themed background" 
        : "a clean, minimalist, light-colored background";
    const prompt = `A professional, high-resolution product photograph of the ${phoneName}. The phone should be displayed on ${background}. Studio lighting. Front view, slightly angled to show depth.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: prompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const dataUrl = `data:image/png;base64,${base64ImageBytes}`;
            try {
                sessionStorage.setItem(cacheKey, dataUrl);
            } catch (e) { /* Storage full, ignore */ }
            return dataUrl;
        }
    }

    throw new Error('Image generation failed.');
};

const phoneListSchema = {
    type: Type.OBJECT,
    properties: {
        models: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of all official phone model names."
        }
    },
    required: ["models"]
};

export const fetchPhoneModelsByBrand = async (brandName: string): Promise<string[]> => {
    const prompt = `List all available phone models for the brand "${brandName}". Provide the full, official model names. Sort the list alphabetically. Return the data as a JSON object with a single key "models" which is an array of strings.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: phoneListSchema,
            temperature: 0,
        },
    });

    const jsonText = response.text.trim();
    try {
        const data: PhoneModelsApiResponse = JSON.parse(jsonText);
        return data.models || [];
    } catch (error) {
        console.error("Failed to parse phone models response:", jsonText, error);
        throw new Error(`The AI returned an invalid response for ${brandName} models.`);
    }
};

export const findPhonesBySpec = async (query: string): Promise<string[]> => {
    const prompt = `
        Act as a smartphone tech expert. A user is searching for phones with specific features.
        User query: "${query}"
        
        Based on this query, identify and list up to 15 relevant phone models that are currently available or were released in the last 2-3 years.
        - Provide their full, official model names.
        - Prioritize well-known models.
        
        Return the data as a JSON object with a single key "models" which is an array of strings.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: phoneListSchema,
            temperature: 0.3,
        },
    });

    const jsonText = response.text.trim();
    try {
        const data: PhoneModelsApiResponse = JSON.parse(jsonText);
        return data.models || [];
    } catch (error) {
        console.error("Failed to parse phone spec search response:", jsonText, error);
        throw new Error(`The AI returned an invalid response for your search.`);
    }
};

const recommendationsSchema = {
    type: Type.OBJECT,
    properties: {
        recommendations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The full, official model name of the recommended phone." },
                    reason: { type: Type.STRING, description: "A brief, one-sentence reason why this phone is a good recommendation." }
                },
                required: ["name", "reason"]
            },
            description: "A list of 3-5 recommended phone models."
        },
        summary: {
            type: Type.STRING,
            description: "A short summary explaining the rationale behind the collective recommendations. Written in markdown format."
        }
    },
    required: ["recommendations", "summary"]
};

export const getPhoneRecommendations = async (userPrompt: string): Promise<AIRecommendation> => {
    const prompt = `
        A user is looking for a new phone. Here is their request: "${userPrompt}".
        Based on this request, act as a tech expert and recommend 3-5 suitable phone models. 
        For each phone, provide its full official name and a brief, one-sentence reason for the recommendation.
        Also provide a short summary of your recommendations, formatted in markdown.
        Return the data in the specified JSON format.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: recommendationsSchema,
            temperature: 0.5,
        },
    });
    const jsonText = response.text.trim();
    try {
        const data = JSON.parse(jsonText);
        return data as AIRecommendation;
    } catch (error) {
        console.error("Failed to parse recommendations response:", jsonText, error);
        throw new Error("The AI returned an invalid response for recommendations.");
    }
};

const batteryEstimateSchema = {
    type: Type.OBJECT,
    properties: {
        phone1_estimate: { type: Type.STRING, description: "A realistic battery life estimate for the first phone (e.g., '6-7 hours of screen-on time', 'About 1.5 days of typical use')." },
        phone2_estimate: { type: Type.STRING, description: "A realistic battery life estimate for the second phone." },
        explanation: { type: Type.STRING, description: "A brief, 1-2 sentence explanation for the estimates, considering specs and the usage profile. Written in markdown." }
    },
    required: ["phone1_estimate", "phone2_estimate", "explanation"]
};

export const estimateBatteryLife = async (phone1: PhoneData, phone2: PhoneData, usageProfile: string): Promise<BatteryEstimate> => {
    const prompt = `
        Act as a smartphone battery life expert.
        Phone 1: ${phone1.name} (Specs: Battery: ${phone1.specs['Battery'] || 'N/A'}, Display: ${phone1.specs['Display'] || 'N/A'}, Chipset: ${phone1.specs['Chipset'] || 'N/A'})
        Phone 2: ${phone2.name} (Specs: Battery: ${phone2.specs['Battery'] || 'N/A'}, Display: ${phone2.specs['Display'] || 'N/A'}, Chipset: ${phone2.specs['Chipset'] || 'N/A'})

        Given the user's usage profile: "${usageProfile}"

        Provide a realistic battery life estimate for each phone. Consider their battery capacity (mAh), screen technology and resolution, and processor efficiency.
        Return the result in the specified JSON format.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: batteryEstimateSchema,
            temperature: 0.4,
        },
    });
    const jsonText = response.text.trim();
    try {
        const data = JSON.parse(jsonText);
        return data as BatteryEstimate;
    } catch (error) {
        console.error("Failed to parse battery estimate response:", jsonText, error);
        throw new Error("The AI returned an invalid response for battery estimates.");
    }
};

const upgradeAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        analysis: { type: Type.STRING, description: "A detailed but easy-to-understand analysis on whether an upgrade is worthwhile. It should compare the current phone to both new phones. Discuss key improvements (camera, performance, battery), potential downsides (cost, minor changes), and give a final recommendation. Use markdown format." }
    },
    required: ["analysis"]
};


export const analyzeUpgradeWorthiness = async (currentPhoneName: string, phone1: PhoneData, phone2: PhoneData): Promise<UpgradeAnalysis> => {
    const prompt = `
        Act as a smartphone tech analyst. A user is considering upgrading from their current phone, the "${currentPhoneName}".
        The two potential upgrade options are:
        - Option 1: ${phone1.name} (Specs: Battery: ${phone1.specs['Battery'] || 'N/A'}, Display: ${phone1.specs['Display'] || 'N/A'}, Chipset: ${phone1.specs['Chipset'] || 'N/A'}, Main Camera: ${phone1.specs['Main Camera'] || 'N/A'})
        - Option 2: ${phone2.name} (Specs: Battery: ${phone2.specs['Battery'] || 'N/A'}, Display: ${phone2.specs['Display'] || 'N/A'}, Chipset: ${phone2.specs['Chipset'] || 'N/A'}, Main Camera: ${phone2.specs['Main Camera'] || 'N/A'})

        First, briefly acknowledge the user's current phone. If "${currentPhoneName}" seems invalid or too generic, start the analysis by mentioning that and proceed with a general upgrade advice.
        
        Then, provide a detailed analysis covering the following points in markdown format:
        1.  **Value Proposition**: Is it a good time to upgrade from the ${currentPhoneName}?
        2.  **Upgrade to ${phone1.name}**: What are the key benefits (e.g., camera, performance, battery)? Is it a significant leap? What are the downsides?
        3.  **Upgrade to ${phone2.name}**: How does this upgrade compare? Highlight its unique advantages over the current phone.
        4.  **Recommendation**: Conclude with a clear recommendation. Which phone is a better upgrade, or should the user wait? Consider value for money.

        Return the result in the specified JSON format.
    `;
    
    // Using Thinking Mode for deep reasoning on upgrades
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: upgradeAnalysisSchema,
            thinkingConfig: { thinkingBudget: 32768 } // Max budget for deep reasoning
        },
    });
    const jsonText = response.text.trim();
    try {
        const data = JSON.parse(jsonText);
        return data as UpgradeAnalysis;
    } catch (error) {
        console.error("Failed to parse upgrade analysis response:", jsonText, error);
        throw new Error("The AI returned an invalid response for the upgrade analysis.");
    }
};

// --- FEATURE 1: BUYING GUIDE (Grounding) ---

export const fetchBuyingInfo = async (phone1Name: string, phone2Name: string, location?: {lat: number, lng: number}): Promise<BuyingGuideData> => {
    // 1. Search for prices online
    const searchPrompt = `Find current new prices for ${phone1Name} and ${phone2Name} at major US retailers like Amazon, Best Buy, and Walmart.`;
    const searchRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: searchPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    const searchChunks = searchRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 2. Search for local availability using location if available
    let mapsPrompt = `Find electronics stores that sell mobile phones.`;
    const mapToolConfig: any = { tools: [{ googleMaps: {} }] };
    
    if (location) {
        mapsPrompt = `Find electronics stores near me that likely sell ${phone1Name} or ${phone2Name}.`;
        mapToolConfig.toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: location.lat,
                    longitude: location.lng
                }
            }
        };
    } else {
        mapsPrompt = `Find major electronics retailers in the US that sell mobile phones.`;
    }

    const mapsRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: mapsPrompt,
        config: mapToolConfig
    });
    const mapChunks = mapsRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // 3. Synthesize into JSON
    const synthesizePrompt = `
        I have gathered search results and map results for buying phones.
        
        Search Grounding Info: ${JSON.stringify(searchChunks)}
        Maps Grounding Info: ${JSON.stringify(mapChunks)}
        
        Task: Create a structured buying guide for "${phone1Name}" and "${phone2Name}".
        1. Extract online buying options (Retailer Name, Price if available, URL) from Search Info.
        2. Extract local store options (Store Name, URL) from Maps Info.
        3. Write a very brief summary (1-2 sentences) about availability.
        
        Return JSON matching this schema:
        {
            "online_options": [{ "source": "online", "title": string, "uri": string, "price": string }],
            "local_options": [{ "source": "local", "title": string, "uri": string }],
            "summary": string
        }
    `;

    const synthRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: synthesizePrompt,
        config: { responseMimeType: "application/json" }
    });

    return JSON.parse(synthRes.text) as BuyingGuideData;
};

// ... (Rest of file: generateCinematicVideo, generateAgentImage, editAgentImage, generateAgentVideo, searchGoogle, searchMaps, transcribeAudio, synthesizeSpeech, connectLiveAPI, agentChat - UNCHANGED)
// Re-exporting unchanged parts for brevity if tooling allowed partials, but here I must provide full content or valid replacement.
// Since I must output full content, I will paste the rest of the file below.

export const generateCinematicVideo = async (phoneName: string): Promise<string> => {
    const prompt = `A cinematic, high-tech commercial shot of the ${phoneName} rotating slowly in a futuristic, neon-lit environment. 4k resolution, highly detailed, professional product videography.`;
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed.");
    
    const response = await fetch(`${downloadLink}&key=${API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const generateAgentImage = async (prompt: string, size: '1K' | '2K' | '4K' = '1K', aspectRatio: string = '1:1'): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
            imageConfig: {
                aspectRatio: aspectRatio as any, 
                imageSize: size,
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error('No image generated.');
};

export const editAgentImage = async (prompt: string, base64Image: string): Promise<string> => {
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: cleanBase64
                    }
                },
                { text: prompt }
            ]
        }
    });
     for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error('Image edit failed.');
}

export const generateAgentVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9', base64Image?: string): Promise<string> => {
    let operation;
    
    if (base64Image) {
         const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
         operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: cleanBase64,
                mimeType: 'image/png'
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio
            }
        });
    } else {
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio
            }
        });
    }

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed to provide a URI.");
    
    const vidResponse = await fetch(`${downloadLink}&key=${API_KEY}`);
    const blob = await vidResponse.blob();
    return URL.createObjectURL(blob);
};

export const searchGoogle = async (query: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });
    return response.text;
}

export const searchMaps = async (query: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
            tools: [{ googleMaps: {} }]
        }
    });
    return response.text;
}

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
    const cleanBase64 = audioBase64.replace(/^data:audio\/(wav|mp3|ogg|webm);base64,/, '');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [{
                inlineData: {
                    mimeType: 'audio/wav',
                    data: cleanBase64
                }
            }, { text: "Transcribe this audio exactly." }]
        }
    });
    return response.text;
}

export const synthesizeSpeech = async (text: string): Promise<ArrayBuffer> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("TTS failed");
    
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export const connectLiveAPI = async (
    onAudioData: (data: ArrayBuffer) => void, 
    onClose: () => void
) => {
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    let nextStartTime = 0;

    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => console.log('Live session opened'),
            onmessage: async (message) => {
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    const binaryString = atob(base64Audio);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    const audioBuffer = await outputAudioContext.decodeAudioData(bytes.buffer.slice(0));
                     
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputAudioContext.destination);
                    
                    const currentTime = outputAudioContext.currentTime;
                    if (nextStartTime < currentTime) {
                        nextStartTime = currentTime;
                    }
                    source.start(nextStartTime);
                    nextStartTime += audioBuffer.duration;
                }
            },
            onclose: () => onClose(),
            onerror: (err) => console.error("Live API Error", err)
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            systemInstruction: "You are a helpful phone expert assistant. Keep answers concise."
        }
    });
}

export const agentChat = async (
    history: any[], 
    newMessage: string, 
    attachments: { data: string, mimeType: string }[],
    config: { thinking: boolean, fast: boolean }
) => {
    const tools: any[] = [
        { functionDeclarations: [
            {
                name: "generate_image",
                description: "Generate an image based on a prompt. Use this when user explicitly asks to create/draw/generate a picture.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        prompt: { type: Type.STRING },
                        aspectRatio: { type: Type.STRING, enum: ["1:1", "16:9", "9:16", "4:3", "3:4"], description: "Default 1:1" },
                        size: { type: Type.STRING, enum: ["1K", "2K", "4K"], description: "Default 1K" }
                    },
                    required: ["prompt"]
                }
            },
            {
                name: "generate_video",
                description: "Generate a video. Use when user asks to make/create a video or animate an image.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        prompt: { type: Type.STRING },
                        aspectRatio: { type: Type.STRING, enum: ["16:9", "9:16"], description: "Default 16:9" }
                    },
                    required: ["prompt"]
                }
            },
            {
                name: "edit_image",
                description: "Edit an attached image. Use when user asks to change/modify/add to an existing image.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        prompt: { type: Type.STRING, description: "Instructions for the edit" }
                    },
                    required: ["prompt"]
                }
            },
            {
                name: "search_google",
                description: "Search the web for real-time info, news, specs, prices.",
                parameters: {
                    type: Type.OBJECT,
                    properties: { query: { type: Type.STRING } },
                    required: ["query"]
                }
            },
            {
                name: "search_maps",
                description: "Search for places or locations.",
                parameters: {
                    type: Type.OBJECT,
                    properties: { query: { type: Type.STRING } },
                    required: ["query"]
                }
            }
        ]}
    ];

    let model = 'gemini-3-pro-preview';
    let requestConfig: any = { tools };

    if (config.fast) {
        model = 'gemini-2.5-flash-lite';
    } else if (config.thinking) {
        model = 'gemini-3-pro-preview';
        requestConfig = {
            ...requestConfig,
            thinkingConfig: { thinkingBudget: 32768 }
        };
    }

    const parts: any[] = [];
    if (attachments && attachments.length > 0) {
        attachments.forEach(att => {
            parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
        });
    }
    parts.push({ text: newMessage });
    
    const response = await ai.models.generateContent({
        model,
        contents: parts.length > 1 ? { parts } : parts[0],
        config: requestConfig
    });

    return response;
};
