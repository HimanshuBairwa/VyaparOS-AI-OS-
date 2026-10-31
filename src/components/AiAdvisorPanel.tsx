'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  MessageSquare,
  Copy,
  Check,
  Send,
  Lightbulb,
  ShieldCheck,
  Bot,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { StrategicBriefingResult } from '@/lib/ai-assistant';

interface AiAdvisorPanelProps {
  candidate: any;
  product: any;
  demand: any;
  budgetPaise: number;
  onApplyBudget?: (budgetRupees: number) => void;
}

export function AiAdvisorPanel({
  candidate,
  product,
  demand,
  budgetPaise,
  onApplyBudget,
}: AiAdvisorPanelProps) {
  const [briefing, setBriefing] = useState<StrategicBriefingResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Copilot Q&A state
  const [copilotQuestion, setCopilotQuestion] = useState<string>('');
  const [copilotAnswer, setCopilotAnswer] = useState<any | null>(null);
  const [isAsking, setIsAsking] = useState<boolean>(false);

  // Fetch AI briefing whenever candidate changes
  useEffect(() => {
    if (!candidate || !product) return;

    let isMounted = true;
    const fetchBriefing = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/ai/briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate,
            product,
            demand,
            budgetPaise,
          }),
        });
        const data = await res.json();
        if (isMounted && data.briefing) {
          setBriefing(data.briefing);
        }
      } catch (err) {
        console.error('Failed to fetch briefing:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBriefing();
    return () => {
      isMounted = false;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [candidate?.quoteId, candidate?.quantity, product?.id, budgetPaise]);

  // Voice Speech Synthesis (Hinglish/Hindi)
  const handlePlayVoice = () => {
    if (!briefing || !window.speechSynthesis) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const text = briefing.spokenHinglishBriefing;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find Hindi or Indian English voice if available
    const voices = window.speechSynthesis.getVoices();
    const hiVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('IN'));
    if (hiVoice) utterance.voice = hiVoice;
    
    utterance.rate = 0.95; // Clear and natural tempo
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleAskCopilot = async (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;
    setIsAsking(true);
    setCopiedType(null);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          context: {
            budgetPaise,
            candidate,
            product,
            demand,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCopilotAnswer(data);
      }
    } catch (err) {
      console.error('Copilot ask error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-teal-900 via-stone-900 to-[#0F172A] text-white rounded-xl p-5 shadow-lg space-y-5 border border-teal-500/30">
      {/* Top Banner with Model Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/30">
            <Sparkles className="w-4 h-4 text-teal-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide flex items-center gap-2">
              <span>VyaparOS AI Copilot & Voice Advisor</span>
              <span className="text-[10px] bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-700/50 uppercase font-mono">
                {briefing?.modelUsed || 'AI Reasoning Engine'}
              </span>
            </h3>
            <p className="text-[11px] text-stone-300">
              Multi-tiered strategic reasoning, Hinglish voice briefing & vendor WhatsApp drafts
            </p>
          </div>
        </div>

        {/* Listen Voice Button */}
        <button
          onClick={handlePlayVoice}
          disabled={!briefing}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition shadow-sm ${
            isPlayingAudio
              ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300 animate-pulse'
              : 'bg-teal-500 hover:bg-teal-400 text-stone-950'
          }`}
        >
          {isPlayingAudio ? (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Voice</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>🔊 Suniye (Hindi Voice)</span>
            </>
          )}
        </button>
      </div>

      {isLoading && !briefing ? (
        <div className="py-6 text-center text-xs text-teal-200/70 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <span>Generating strategic merchant synthesis...</span>
        </div>
      ) : briefing ? (
        <div className="space-y-4">
          {/* Spoken Hinglish Briefing Card */}
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10 space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-teal-300 font-bold block">
              Daily Merchant Briefing (Hinglish):
            </span>
            <p className="text-sm font-medium text-stone-100 leading-relaxed italic">
              &ldquo;{briefing.spokenHinglishBriefing}&rdquo;
            </p>
          </div>

          {/* WhatsApp Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Supplier WhatsApp Draft */}
            <div className="bg-black/30 p-3.5 rounded-lg border border-white/10 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-teal-400" />
                    Supplier Order WhatsApp Draft
                  </span>
                  <span className="text-[10px] text-stone-400">Ready to Send</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded border border-white/5 font-mono text-[11px] text-stone-200 whitespace-pre-wrap leading-tight">
                  {briefing.supplierNegotiationDraft}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => handleCopy(briefing.supplierNegotiationDraft, 'SUPPLIER')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-stone-200 rounded text-[11px] transition"
                >
                  {copiedType === 'SUPPLIER' ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                  {copiedType === 'SUPPLIER' ? 'Copied!' : 'Copy Text'}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(briefing.supplierNegotiationDraft)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition"
                >
                  <Send className="w-3 h-3" />
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Customer Pickup Intimation Draft */}
            <div className="bg-black/30 p-3.5 rounded-lg border border-white/10 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-teal-400" />
                    Customer Pickup Confirmation
                  </span>
                  <span className="text-[10px] text-stone-400">Student Notification</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded border border-white/5 font-mono text-[11px] text-stone-200 whitespace-pre-wrap leading-tight">
                  {briefing.customerIntimationDraft}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => handleCopy(briefing.customerIntimationDraft, 'CUSTOMER')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-stone-200 rounded text-[11px] transition"
                >
                  {copiedType === 'CUSTOMER' ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                  {copiedType === 'CUSTOMER' ? 'Copied!' : 'Copy Text'}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(briefing.customerIntimationDraft)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition"
                >
                  <Send className="w-3 h-3" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Tactical Advice & Risk Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-teal-950/40 border border-teal-500/20 p-3 rounded-lg">
              <span className="text-teal-300 font-bold flex items-center gap-1 text-[11px] mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                Merchant Tactical Display Tip:
              </span>
              <p className="text-stone-300 leading-relaxed text-[11px]">
                {briefing.tacticalAdvice}
              </p>
            </div>

            <div className="bg-stone-900/60 border border-white/10 p-3 rounded-lg">
              <span className="text-stone-300 font-bold flex items-center gap-1 text-[11px] mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Capital Risk Assessment:
              </span>
              <p className="text-stone-400 leading-relaxed text-[11px]">
                {briefing.riskAssessment}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Interactive "Ask VyaparOS AI" Bar */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-stone-200 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-teal-400" />
            Ask VyaparOS AI Copilot:
          </span>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <button
              onClick={() => handleAskCopilot('Agar mera budget sirf ₹600 ho toh kya karun?')}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-teal-200"
            >
              &ldquo;Budget sirf ₹600 ho toh?&rdquo;
            </button>
            <button
              onClick={() => handleAskCopilot('Supplier A se bargaining kaise karun?')}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-teal-200"
            >
              &ldquo;Supplier se bargain kaise karun?&rdquo;
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskCopilot(copilotQuestion);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={copilotQuestion}
            onChange={(e) => setCopilotQuestion(e.target.value)}
            placeholder="Type any question in Hindi or English (e.g. 'Can I buy 6 units instead?')"
            className="flex-1 bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-teal-400"
          />
          <button
            type="submit"
            disabled={isAsking || !copilotQuestion.trim()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-stone-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
          >
            {isAsking ? 'Thinking...' : 'Ask AI'}
          </button>
        </form>

        {copilotAnswer && (
          <div className="p-3 bg-white/10 rounded-lg border border-teal-400/30 text-xs space-y-2 animate-fadeIn">
            <p className="text-stone-100 leading-relaxed">
              {copilotAnswer.answer}
            </p>
            {copilotAnswer.suggestedAction === 'CHANGE_BUDGET' && copilotAnswer.suggestedBudgetRupees && onApplyBudget && (
              <button
                onClick={() => onApplyBudget(copilotAnswer.suggestedBudgetRupees)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-teal-500 text-stone-950 rounded text-xs font-bold hover:bg-teal-400"
              >
                Apply Budget ₹{copilotAnswer.suggestedBudgetRupees} to Preview
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
