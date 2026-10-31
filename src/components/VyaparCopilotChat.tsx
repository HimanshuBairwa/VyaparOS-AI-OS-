'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  RotateCcw,
  Store,
  TrendingUp,
} from 'lucide-react';

interface VyaparCopilotChatProps {
  onNavigateTab: (tab: any) => void;
  availableBudgetPaise: number;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestedTab?: string;
  keyInsights?: string[];
}

export function VyaparCopilotChat({ onNavigateTab, availableBudgetPaise }: VyaparCopilotChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Namaste! Main hoon aapka **VyaparOS AI Sahayak**. Aaj dukaan me kya khareedna hai, kitna budget bacha hai, ya kisi supplier se rate bargain karna hai—mujhe bol kar ya type karke poochhiye.',
      timestamp: 'Just now',
      keyInsights: [
        'Live spendable purchasing budget: ₹' + (availableBudgetPaise / 100).toFixed(0),
        'Try asking: "Aaj kya khareedun sabse pehle?"',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const liveSpeechResultRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Text-to-speech for AI answers
  const handleSpeakText = (text: string) => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const hiVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('IN'));
    if (hiVoice) utterance.voice = hiVoice;
    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          context: { budgetPaise: availableBudgetPaise },
        }),
      });

      const data = await res.json();
      if (data.success) {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedTab: data.suggestedTab,
          keyInsights: data.keyInsights,
        };
        setMessages((prev) => [...prev, botMsg]);

        // Auto speak short answers if user used voice
        if (isSpeaking) {
          handleSpeakText(data.answer);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'bot',
            text: 'Bhaiya thoda network issue lag raha hai, par aapka current spendable budget ₹' + (availableBudgetPaise / 100).toFixed(0) + ' hai.',
            timestamp: 'Just now',
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: 'VyaparOS Autonomous Decision Engine active hai! Current spendable budget: ₹' + (availableBudgetPaise / 100).toFixed(0),
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Voice recording for chat
  const handleToggleVoice = async () => {
    if (isRecording) {
      stopVoice();
      return;
    }

    pcmChunksRef.current = [];
    liveSpeechResultRef.current = '';

    // 1. Try Browser Native SpeechRecognition for instant 0ms latency
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = navigator.language || 'en-IN';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
          if (fullTranscript.trim()) {
            liveSpeechResultRef.current = fullTranscript.trim();
            setInputText(fullTranscript.trim());
          }
        };

        recognition.onerror = (err: any) => {
          console.log('Speech recognition notice:', err.error);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (e) {
        console.warn('Native speech recognition start notice:', e);
      }
    }

    // 2. Microphone stream & audio capture fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      audioSourceRef.current = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      audioProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone error in chat bot:', err);
      // If browser speech was started, keep recording
      if (speechRecognitionRef.current) {
        setIsRecording(true);
      } else {
        alert('Microphone access denied. Please type your question directly.');
      }
    }
  };

  const stopVoice = async () => {
    setIsRecording(false);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }

    if (audioProcessorRef.current) {
      try { audioProcessorRef.current.disconnect(); } catch (_) {}
      audioProcessorRef.current = null;
    }
    if (audioSourceRef.current) {
      try { audioSourceRef.current.disconnect(); } catch (_) {}
      audioSourceRef.current = null;
    }

    const currentAudioCtx = audioContextRef.current;
    let sampleRate = 44100;
    if (currentAudioCtx) {
      sampleRate = currentAudioCtx.sampleRate || 44100;
      try { currentAudioCtx.close(); } catch (_) {}
      audioContextRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // If browser speech recognized text, immediately submit it!
    const liveText = liveSpeechResultRef.current.trim();
    if (liveText && liveText.length > 1) {
      handleSendMessage(liveText);
      return;
    }

    const chunks = pcmChunksRef.current;
    pcmChunksRef.current = [];
    if (!chunks || chunks.length === 0) return;

    let totalSamples = 0;
    for (const c of chunks) totalSamples += c.length;
    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    // Downsample to 16kHz
    const ratio = sampleRate / 16000;
    const newLen = Math.round(merged.length / ratio);
    const downsampled = new Float32Array(newLen);
    let offRes = 0, offIn = 0;
    while (offRes < downsampled.length) {
      const nextOffIn = Math.round((offRes + 1) * ratio);
      let acc = 0, count = 0;
      for (let i = offIn; i < nextOffIn && i < merged.length; i++) {
        acc += merged[i];
        count++;
      }
      downsampled[offRes] = count > 0 ? acc / count : merged[offIn];
      offRes++;
      offIn = nextOffIn;
    }

    // Convert to base64
    const bytes = new Uint8Array(downsampled.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    const pcmBase64 = btoa(binary);

    setIsThinking(true);
    try {
      const res = await fetch('/api/extract/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pcmBase64 }),
      });
      const data = await res.json();
      if (data.success && data.transcript) {
        handleSendMessage(data.transcript);
      }
    } catch (e) {
      console.warn('Voice transcribe error:', e);
    } finally {
      setIsThinking(false);
    }
  };

  const samplePrompts = [
    'what is the margin of ball point pen',
    'what is the margin of pen',
    'Aaj kya khareedun sabse pehle?',
    'Mera spendable budget kitna hai?',
    'Low stock items kaunse hain?',
  ];

  return (
    <>
      {/* Floating Trigger Button in Bottom-Right Corner */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#002970] hover:bg-[#001D4F] text-white rounded-full shadow-2xl transition-all duration-200 hover:scale-105 border-2 border-[#00BAF2]"
          title="Open VyaparOS AI Sahayak"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-[#00BAF2]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-tight flex items-center gap-1">
              <span>VyaparOS AI Sahayak</span>
              <Sparkles className="w-3 h-3 text-[#00BAF2]" />
            </div>
            <div className="text-[10px] text-slate-300 font-medium">व्यापार सहायक • Online</div>
          </div>
        </button>
      )}

      {/* Floating Chat Drawer / Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? 'inset-4 sm:inset-10'
              : 'bottom-5 right-5 w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#002970] to-[#001D4F] p-3.5 text-white flex items-center justify-between border-b border-[#00BAF2]/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00BAF2]/20 border border-[#00BAF2]/40 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#00BAF2]" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5 leading-none">
                  <span>VyaparOS AI Sahayak</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded font-mono">
                    Active
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Autonomous Decision Intelligence • Hindi & English
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-md"
                title={isExpanded ? 'Restore size' : 'Expand full view'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-md"
                title="Close AI Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 overflow-x-auto flex gap-1.5 text-[11px] shrink-0 no-scrollbar">
            {samplePrompts.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(sp)}
                className="bg-white hover:bg-teal-50 hover:text-teal-900 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition shadow-2xs"
              >
                {sp}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#FAF9F6]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                    m.sender === 'user'
                      ? 'bg-[#002970] text-white rounded-br-xs'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  {/* Message Text with basic markdown bold rendering */}
                  <div className="whitespace-pre-wrap">
                    {m.text.split('\n').map((line, lIdx) => (
                      <p key={lIdx} className={lIdx > 0 ? 'mt-1.5' : ''}>
                        {line.split('**').map((seg, sIdx) =>
                          sIdx % 2 === 1 ? <strong key={sIdx}>{seg}</strong> : seg
                        )}
                      </p>
                    ))}
                  </div>

                  {/* Key Insights Pills */}
                  {m.keyInsights && m.keyInsights.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                      {m.keyInsights.map((ki, kIdx) => (
                        <div
                          key={kIdx}
                          className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-medium flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
                          <span>{ki}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interactive Action Button (e.g. Go to Purchase Plan) */}
                  {m.suggestedTab && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          onNavigateTab(m.suggestedTab);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-xs transition"
                      >
                        <span>Open {m.suggestedTab.replace('_', ' ')} Tab</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                  {m.sender === 'bot' && (
                    <button
                      onClick={() => handleSpeakText(m.text)}
                      className="text-slate-400 hover:text-teal-700 text-[10px] flex items-center gap-0.5"
                      title="Listen aloud in Hindi / English"
                    >
                      {isSpeaking ? <VolumeX className="w-3 h-3 text-rose-600" /> : <Volume2 className="w-3 h-3" />}
                      <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-500 w-fit shadow-xs animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                <span>VyaparOS AI is analyzing store facts...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Active Indicator */}
          {isRecording && (
            <div className="bg-rose-50 border-t border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-900 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping"></span>
                <span className="font-bold">Listening to your voice... Speak now</span>
              </div>
              <button
                onClick={stopVoice}
                className="bg-rose-600 text-white px-2.5 py-0.5 rounded font-bold text-xs"
              >
                Done
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask anything: 'Aaj kya khareedun?' or 'Check stock'..."
                  className="w-full text-xs sm:text-sm pl-3 pr-10 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-slate-50 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`absolute right-2 top-2 p-1 rounded-lg transition ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'text-slate-500 hover:text-teal-700 hover:bg-slate-200'
                  }`}
                  title="Speak into AI Bot"
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isThinking}
                className="p-2.5 bg-[#002970] hover:bg-[#001D4F] disabled:opacity-50 text-white rounded-xl shadow-xs transition"
                title="Send question"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
