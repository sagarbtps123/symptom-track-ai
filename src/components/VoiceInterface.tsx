import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { GeminiLiveClient } from '../lib/gemini';
import { cn } from '../lib/utils';

interface VoiceInterfaceProps {
  onDataExtracted: (data: { symptoms: string; medicines: string; appointments: string; transcription: string }) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onDataExtracted }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const startConnection = async () => {
    setIsConnecting(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey || apiKey === 'undefined') {
        console.error("GEMINI_API_KEY is missing. Please set it in the environment.");
        alert("Gemini API Key is missing. Please check your configuration.");
        setIsConnecting(false);
        return;
      }
      const client = new GeminiLiveClient(apiKey);
      clientRef.current = client;

      const systemInstruction = `
        You are a medical assistant. Your goal is to help patients record their symptoms, past medicines, and doctor appointments.
        You support both English and Hindi.
        Be empathetic and professional.
        When the user has finished sharing their information, summarize it and ask if they want to save it.
        If they say yes, provide the data in a structured format using a tool call or a specific keyword like "EXTRACT_DATA: {symptoms: '...', medicines: '...', appointments: '...'}".
      `;

      await client.connect({
        onopen: () => {
          setIsConnected(true);
          setIsConnecting(false);
          startMicrophone();
        },
        onmessage: (message) => {
          if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
            const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
            playAudio(base64Audio);
          }
          
          if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
            const text = message.serverContent.modelTurn.parts[0].text;
            setTranscription(prev => {
              const updated = prev + ' ' + text;
              
              // Check for data extraction keyword
              if (text.includes('EXTRACT_DATA:')) {
                try {
                  const jsonStr = text.split('EXTRACT_DATA:')[1].trim();
                  const data = JSON.parse(jsonStr);
                  onDataExtracted({ ...data, transcription: updated });
                } catch (e) {
                  console.error("Failed to parse extracted data", e);
                }
              }
              return updated;
            });
          }
        },
        onerror: (err) => {
          console.error("Gemini Live Error:", err);
          alert("Connection Error: " + (err.message || JSON.stringify(err)));
          setIsConnecting(false);
        },
        onclose: () => {
          console.log("Gemini Live Connection Closed");
          setIsConnected(false);
          stopMicrophone();
        }
      }, systemInstruction);
    } catch (err) {
      console.error("Failed to connect:", err);
      setIsConnecting(false);
    }
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        if (!isMuted && clientRef.current) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          clientRef.current.sendAudio(base64Data);
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      setIsListening(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopMicrophone = () => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    setIsListening(false);
  };

  const playAudio = async (base64Data: string) => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcmData = new Int16Array(bytes.buffer);
    audioQueueRef.current.push(pcmData);
    if (!isPlayingRef.current) {
      processAudioQueue();
    }
  };

  const processAudioQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    const audioContext = new AudioContext({ sampleRate: 24000 });
    const buffer = audioContext.createBuffer(1, pcmData.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x7FFF;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => {
      audioContext.close();
      processAudioQueue();
    };
    source.start();
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const disconnect = () => {
    clientRef.current?.close();
    stopMicrophone();
    setIsConnected(false);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl">
      <div className="relative">
        <div className={cn(
          "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
          isConnected ? "bg-blue-500 shadow-lg shadow-blue-500/50 scale-110" : "bg-gray-200",
          isListening && !isMuted && "animate-pulse"
        )}>
          {isConnecting ? (
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          ) : isConnected ? (
            <Mic className="w-12 h-12 text-white" />
          ) : (
            <MicOff className="w-12 h-12 text-gray-400" />
          )}
        </div>
        
        {isConnected && (
          <div className="absolute -bottom-2 -right-2">
            <button
              onClick={toggleMute}
              className={cn(
                "p-3 rounded-full shadow-md transition-colors",
                isMuted ? "bg-red-500 text-white" : "bg-white text-gray-700"
              )}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-gray-800">
          {isConnected ? "I'm listening..." : "Talk to SymptoTrack AI"}
        </h3>
        <p className="text-gray-500 max-w-xs">
          {isConnected 
            ? "Tell me about your symptoms, medicines, or past appointments in English or Hindi."
            : "Click the button below to start a voice conversation."}
        </p>
      </div>

      {!isConnected ? (
        <button
          onClick={startConnection}
          disabled={isConnecting}
          className="px-8 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          Start Conversation
        </button>
      ) : (
        <button
          onClick={disconnect}
          className="px-8 py-3 bg-red-100 text-red-600 rounded-full font-medium hover:bg-red-200 transition-all"
        >
          End Session
        </button>
      )}

      {transcription && (
        <div className="w-full mt-4 p-4 bg-gray-50 rounded-xl max-h-32 overflow-y-auto text-sm text-gray-600 italic border border-gray-100">
          {transcription}
        </div>
      )}
    </div>
  );
};
