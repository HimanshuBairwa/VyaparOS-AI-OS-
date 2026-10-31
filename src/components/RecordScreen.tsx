'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Camera,
  Image,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info,
  Edit3,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  User,
  Phone,
  Calendar,
  Volume2,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { formatPaiseToRupees, rupeesToPaise } from '@/lib/decision-engine';
import { playPaytmSoundboxChime } from '@/lib/soundbox';

interface RecordScreenProps {
  initialType?: 'SALE' | 'DEMAND' | 'QUOTE';
  products: any[];
  suppliers: any[];
  merchantId: string;
  onEventCreated: () => void;
}

function downsampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) return input;
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;
  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : input[offsetInput];
    offsetResult++;
    offsetInput = nextOffsetInput;
  }
  return result;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

export function RecordScreen({
  initialType = 'SALE',
  products,
  suppliers,
  merchantId,
  onEventCreated,
}: RecordScreenProps) {
  const [eventType, setEventType] = useState<'SALE' | 'DEMAND' | 'QUOTE'>(initialType);

  // Unified Editable Text State (Populated by typing, mic, or bill upload)
  const [inputText, setInputText] = useState<string>('');
  const [inputOrigin, setInputOrigin] = useState<'TYPED' | 'VOICE' | 'BILL'>('TYPED');
  const [isRecording, setIsRecording] = useState(false);
  const [isMediaRecording, setIsMediaRecording] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Camera & Photo State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Web Audio & Whisper Voice Capture Refs
  const audioContextRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const liveSpeechResultRef = useRef<string>('');

  // Editable Structured Form State (Direct manual entry or AI extracted)
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPriceRupees, setUnitPriceRupees] = useState<number>(65);
  const [totalPriceRupees, setTotalPriceRupees] = useState<number>(65);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI_PAYTM' | 'KHATA_DUE'>('CASH');

  // Specific Demand state
  const [failureReason, setFailureReason] = useState<string>('OUT_OF_STOCK');
  const [confirmationState, setConfirmationState] = useState<'CONFIRMED_COMMITMENT' | 'ENQUIRY'>('CONFIRMED_COMMITMENT');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerContact, setCustomerContact] = useState<string>('');
  const [requiredByDate, setRequiredByDate] = useState<string>('');

  // Specific Quote state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [packSize, setPackSize] = useState<number>(12);
  const [minOrderQty, setMinOrderQty] = useState<number>(12);
  const [availableQty, setAvailableQty] = useState<number>(12);
  const [actionCostRupees, setActionCostRupees] = useState<number>(30); // ₹30 delivery
  const [deliveryLeadHours, setDeliveryLeadHours] = useState<number>(4);
  const [validUntilDate, setValidUntilDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Active extracted badge
  const [extractedSourceTag, setExtractedSourceTag] = useState<string | null>(null);

  // Sync unit price when product selection changes (if in Sale mode)
  useEffect(() => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (prod && eventType === 'SALE') {
      const up = Math.round(prod.sellingPricePaise / 100);
      setUnitPriceRupees(up);
      setTotalPriceRupees(up * quantity);
    }
  }, [selectedProductId, eventType]);

  // Sync total price when quantity or unit price changes
  const handleUnitPriceChange = (rupees: number) => {
    setUnitPriceRupees(rupees);
    setTotalPriceRupees(rupees * quantity);
  };

  const handleTotalPriceChange = (total: number) => {
    setTotalPriceRupees(total);
    if (quantity > 0) {
      setUnitPriceRupees(Math.round(total / quantity));
    }
  };

  const handleQuantityChange = (newQty: number) => {
    const q = Math.max(1, newQty);
    setQuantity(q);
    setTotalPriceRupees(unitPriceRupees * q);
  };

  // Helper to apply draft to form
  const applyDraftToForm = (d: any, origin: 'TYPED' | 'VOICE' | 'BILL') => {
    if (d.matchedProductId) setSelectedProductId(d.matchedProductId);
    if (d.quantity) handleQuantityChange(d.quantity);
    if (d.requestedQuantity) handleQuantityChange(d.requestedQuantity);
    if (d.unitPricePaise) handleUnitPriceChange(Math.round(d.unitPricePaise / 100));
    if (d.unitCostPaise) setUnitPriceRupees(Math.round(d.unitCostPaise / 100));
    if (d.paymentMethod) setPaymentMethod(d.paymentMethod);
    if (d.failureReason) setFailureReason(d.failureReason);
    if (d.confirmationState) setConfirmationState(d.confirmationState);
    if (d.customerName) setCustomerName(d.customerName);
    if (d.matchedSupplierId) setSelectedSupplierId(d.matchedSupplierId);
    if (d.packSize) setPackSize(d.packSize);
    if (d.minOrderQuantity) setMinOrderQty(d.minOrderQuantity);
    if (d.availableQuantity) setAvailableQty(d.availableQuantity);
    if (d.actionCostPaise) setActionCostRupees(Math.round(d.actionCostPaise / 100));
    if (d.notes) setNotes(d.notes);
  };

  // --------------------------------------------------------------------------
  // CAMERA SCANNER IMPLEMENTATION (Live Webcam / Mobile Viewfinder)
  // --------------------------------------------------------------------------
  const openCamera = async () => {
    setStatusMessage(null);
    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Live camera error:', err);
      setIsCameraOpen(false);
      setStatusMessage({
        type: 'info',
        text: 'Live camera permission denied or no webcam found. Please use the "Upload Photo" button instead.',
      });
      // Automatically prompt file upload as fallback
      fileInputRef.current?.click();
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhotoSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImagePreview(dataUrl);
      closeCamera();
      processImageExtraction(dataUrl, 'Camera Photo Scan');
    }
  };

  // --------------------------------------------------------------------------
  // FILE / PHOTO UPLOAD IMPLEMENTATION
  // --------------------------------------------------------------------------
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImagePreview(dataUrl);
      processImageExtraction(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  };

  const processImageExtraction = async (dataUrl: string, label: string) => {
    setIsExtracting(true);
    setStatusMessage({ type: 'info', text: `Analyzing invoice image: ${label}...` });
    setInputOrigin('BILL');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch('/api/extract/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          fileName: label,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json();
      if (data.success && data.extractedDraft) {
        const d = data.extractedDraft;
        const text =
          d.type === 'QUOTE'
            ? `Invoice ${d.invoiceNumber || ''} from ${d.supplierName}: ${d.quantity} units of ${d.matchedVariant} @ ₹${(d.unitCostPaise / 100).toFixed(0)} + ₹${(d.actionCostPaise / 100).toFixed(0)} delivery. Total ₹${(d.totalAmountPaise / 100).toFixed(0)}.`
            : `Cash slip ${d.invoiceNumber || ''}: Sold ${d.quantity} units of ${d.matchedVariant} for ₹${(d.totalAmountPaise / 100).toFixed(0)}.`;

        setInputText(text);
        setEventType(d.type || eventType);
        setExtractedSourceTag(data.fixtureLabel || label);
        applyDraftToForm(d, 'BILL');

        setStatusMessage({
          type: 'success',
          text: `Invoice photo analyzed! Structured facts loaded into editable canvas & form below.`,
        });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to extract bill photo.' });
      }
    } catch (err) {
      clearTimeout(timer);
      setStatusMessage({ type: 'error', text: 'Error extracting bill image. Form is open for direct entry below.' });
    } finally {
      setIsExtracting(false);
    }
  };

  // --------------------------------------------------------------------------
  // HYBRID RESILIENT VOICE ENGINE (Real Web Audio PCM + Local Whisper AI)
  // --------------------------------------------------------------------------
  const handleToggleVoice = async () => {
    if (isRecording || isMediaRecording) {
      stopVoice();
      return;
    }

    setStatusMessage(null);
    liveSpeechResultRef.current = '';
    pcmChunksRef.current = [];

    // 1. Request real microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
    } catch (micErr: any) {
      console.warn('Microphone access denied:', micErr);
      setStatusMessage({
        type: 'error',
        text: 'Microphone permission denied or no mic found. Please enable your microphone or type your note directly.',
      });
      return;
    }

    // 2. Set up AudioContext PCM capture (captures raw audio samples locally)
    try {
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
    } catch (e) {
      console.warn('AudioContext setup error:', e);
    }

    // 3. Parallel Web Speech API for instant live visual feedback if browser supports it
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
          console.log('Browser speech recognition notice:', err.error);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (e) {
        console.warn('SpeechRecognition failed to start:', e);
      }
    }

    setIsRecording(true);
    setStatusMessage({
      type: 'info',
      text: '🎤 Microphone active! Speak now in Hindi or English... Click "Done" when finished.',
    });
  };

  const stopVoice = async () => {
    setIsRecording(false);
    setIsMediaRecording(false);

    // Stop browser speech recognition
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }

    // Stop audio processor and source
    if (audioProcessorRef.current) {
      try {
        audioProcessorRef.current.disconnect();
      } catch (_) {}
      audioProcessorRef.current = null;
    }
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
      } catch (_) {}
      audioSourceRef.current = null;
    }

    const currentAudioCtx = audioContextRef.current;
    let sampleRate = 44100;
    if (currentAudioCtx) {
      sampleRate = currentAudioCtx.sampleRate || 44100;
      try {
        currentAudioCtx.close();
      } catch (_) {}
      audioContextRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // Check if live browser speech recognition caught words in real time
    const liveText = liveSpeechResultRef.current.trim();
    if (liveText && liveText.length > 1) {
      setInputText(liveText);
      setInputOrigin('VOICE');
      handleAnalyzeText(liveText, eventType, 'VOICE');
      setStatusMessage({
        type: 'success',
        text: `Voice captured: "${liveText}". Structured review loaded below.`,
      });
      return;
    }

    // Otherwise, transcribe the recorded PCM audio with Whisper AI
    const chunks = pcmChunksRef.current;
    pcmChunksRef.current = [];

    if (!chunks || chunks.length === 0) {
      setStatusMessage({
        type: 'info',
        text: 'Recording ended. Speak closer or type notes directly.',
      });
      return;
    }

    // Merge chunks
    let totalSamples = 0;
    for (const c of chunks) totalSamples += c.length;
    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    // Downsample to 16kHz for Whisper
    const downsampled16k = downsampleTo16k(merged, sampleRate);

    // Check maximum amplitude (volume level)
    let maxAmp = 0;
    for (let i = 0; i < downsampled16k.length; i++) {
      const a = Math.abs(downsampled16k[i]);
      if (a > maxAmp) maxAmp = a;
    }

    if (maxAmp < 0.012) {
      setStatusMessage({
        type: 'error',
        text: 'No audio signal detected from microphone (near silence). Please check microphone volume or type your note.',
      });
      return;
    }

    // Base64 encode the Float32Array
    setStatusMessage({
      type: 'info',
      text: 'Transcribing your voice with local Whisper AI...',
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const bytes = new Uint8Array(downsampled16k.buffer);
      const pcmBase64 = uint8ArrayToBase64(bytes);

      const res = await fetch('/api/extract/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pcmBase64, eventType }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json();
      if (data.success && data.transcript) {
        setInputText(data.transcript);
        setInputOrigin('VOICE');
        handleAnalyzeText(data.transcript, eventType, 'VOICE');
        setStatusMessage({
          type: 'success',
          text: `Voice transcribed by Whisper AI: "${data.transcript}". Review below before saving.`,
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: data.error || 'No clear speech detected. Please speak closer or type directly.',
        });
      }
    } catch (err) {
      clearTimeout(timer);
      setStatusMessage({
        type: 'info',
        text: 'Speech recognition ended. You can type notes freely in the box below.',
      });
    }
  };

  // Analyze text and populate editable form fields
  const handleAnalyzeText = async (
    textToParse: string,
    type: 'SALE' | 'DEMAND' | 'QUOTE',
    origin: 'TYPED' | 'VOICE' | 'BILL' = 'TYPED'
  ) => {
    if (!textToParse.trim()) return;
    setIsExtracting(true);
    setStatusMessage(null);
    setInputOrigin(origin);

    // 1. Instant optimistic local regex match (0ms latency for merchant)
    const lower = textToParse.toLowerCase();
    const matchedProd = products.find(
      (p) =>
        lower.includes(p.variant.toLowerCase()) ||
        lower.includes(p.name.toLowerCase()) ||
        (lower.includes('atta') && p.name.toLowerCase().includes('sketch')) ||
        (lower.includes('pen') && p.name.toLowerCase().includes('pen')) ||
        (lower.includes('notebook') && p.name.toLowerCase().includes('notebook'))
    );
    if (matchedProd) {
      setSelectedProductId(matchedProd.id);
      setUnitPriceRupees(Math.round(matchedProd.sellingPricePaise / 100));
    }

    const qtyMatch = textToParse.match(/(\d+)\s*(?:pcs?|pieces?|units?|pkts?|packs?|boxes?|pouches?|copies?|bags?)/i) ||
                     textToParse.match(/(\d+)\s+[a-zA-Z]/);
    if (qtyMatch && qtyMatch[1]) {
      const q = parseInt(qtyMatch[1], 10);
      if (q > 0 && q < 500) {
        setQuantity(q);
      }
    }

    const priceMatch = textToParse.match(/(?:for|@|₹|rs\.?)\s*(\d+(?:\.\d{1,2})?)/i) ||
                       textToParse.match(/(\d+)\s*(?:cash|paytm|upi)/i);
    if (priceMatch && priceMatch[1]) {
      const val = parseFloat(priceMatch[1]);
      if (val > 0) {
        setTotalPriceRupees(val);
        const curQ = qtyMatch ? parseInt(qtyMatch[1], 10) : quantity;
        if (curQ > 1 && val > curQ) {
          setUnitPriceRupees(Math.round(val / curQ));
        } else {
          setUnitPriceRupees(val);
        }
      }
    }

    // 2. Claude Sonnet 4.6 AI Enrichment via API with safety timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    try {
      const res = await fetch('/api/extract/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToParse, type }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data = await res.json();
      if (data.success && data.draft) {
        const d = data.draft;
        setExtractedSourceTag(d.extractedBy || 'Claude AI');
        applyDraftToForm(d, origin);

        setStatusMessage({
          type: 'info',
          text: `Text parsed successfully (${origin}). All fields are fully editable below before saving.`,
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: `Values loaded into editable canvas. Review and save below.`,
        });
      }
    } catch (err: any) {
      clearTimeout(timer);
      setStatusMessage({
        type: 'info',
        text: `Fields populated. All values are editable before saving.`,
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Sample bill fixture selection
  const handleSelectBillFixture = async (fixtureId: string) => {
    setIsExtracting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/extract/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId }),
      });
      const data = await res.json();
      if (data.success && data.extractedDraft) {
        const d = data.extractedDraft;
        const simulatedBillText =
          d.type === 'QUOTE'
            ? `Invoice ${d.invoiceNumber} from ${d.supplierName}: ${d.quantity} units of ${d.matchedVariant} @ ₹${(d.unitCostPaise / 100).toFixed(0)} + ₹${(d.actionCostPaise / 100).toFixed(0)} delivery. Total ₹${(d.totalAmountPaise / 100).toFixed(0)}.`
            : `Cash slip ${d.invoiceNumber}: Sold ${d.quantity} units of ${d.matchedVariant} for ₹${(d.totalAmountPaise / 100).toFixed(0)} cash.`;

        setInputText(simulatedBillText);
        setInputOrigin('BILL');
        setEventType(d.type);
        setExtractedSourceTag(data.fixtureLabel);
        applyDraftToForm(d, 'BILL');

        setStatusMessage({
          type: 'info',
          text: `Bill text loaded and parsed from verified fixture. You can edit the text or values freely.`,
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to process bill fixture.' });
    } finally {
      setIsExtracting(false);
    }
  };

  // Sample quick chips across multiple retail trade sectors
  const samplePrompts = {
    SALE: [
      { label: '🛒 2 Atta 5kg Cash ₹480', text: 'Sold 2 5kg Aashirvaad Atta pouches for 480 cash' },
      { label: '📱 1 65W Charger ₹850', text: 'Sold 1 65W GaN Fast Charger for 850 paytm upi' },
      { label: '💊 2 Dolo 650 Boxes ₹900', text: 'Sold 2 boxes of Paracetamol 650mg for 900 cash' },
      { label: '📚 2 A4 Notebooks Cash ₹130', text: 'Sold 2 A4 ruled notebooks 200p for 130 cash' },
    ],
    DEMAND: [
      { label: '🛒 10 units Atta 5kg (Catering)', text: 'Customer asked for 10 bags of 5kg Chakki Atta for community catering tomorrow evening' },
      { label: '📱 12 units 65W Chargers', text: 'Customer asked for 12 pieces 65W GaN Type-C dual chargers by tomorrow 5 PM' },
      { label: '📚 12 A3 Plain Sketchbooks', text: 'A3 plain drawing book chahiye thi 12 pieces fine arts student ko kal sham tak, stock khatam tha' },
    ],
    QUOTE: [
      { label: '🛒 FMCG: 10 Atta @ ₹190', text: 'Metro FMCG Wholesalers: Chakki Atta 5kg bundle 10 pieces, 190 rupaye per piece, 40 delivery, kal 4 baje tak.' },
      { label: '📱 Electronics: 10 Chargers @ ₹500', text: 'Shanti Electronics: 65W GaN Fast Charger 10 pieces, 500 rupaye per piece, 50 delivery, kal 2 baje tak.' },
      { label: '📚 Supplier A 12-pack @ ₹80', text: 'A3 plain ka bundle 12 pieces, 80 rupaye per piece, 30 delivery, kal 4 baje tak.' },
    ],
  };

  // Commit Form to Database
  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const selectedProduct = products.find((p) => p.id === selectedProductId);

    try {
      if (eventType === 'SALE') {
        const res = await fetch('/api/events/sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId,
            lines: [
              {
                productId: selectedProductId,
                quantity,
                unitPricePaise: rupeesToPaise(unitPriceRupees),
              },
            ],
            paymentMethod,
            notes: notes || inputText || 'Direct counter sale',
            idempotencyKey: `IDEM-SALE-${Date.now()}`,
          }),
        });

        const data = await res.json();
        if (data.success) {
          if (paymentMethod === 'UPI_PAYTM') {
            playPaytmSoundboxChime(`Paytm par ${totalPriceRupees} rupaye prapt hue`);
          } else {
            playPaytmSoundboxChime(`${totalPriceRupees} rupaye ki bikri darj hui.`);
          }
          setStatusMessage({
            type: 'success',
            text: `Sale recorded atomically! Inventory reduced by ${quantity} units.`,
          });
          setInputText('');
          setNotes('');
          setCapturedImagePreview(null);
          onEventCreated();
        } else {
          setStatusMessage({ type: 'error', text: data.error || 'Failed to record sale' });
        }
      } else if (eventType === 'DEMAND') {
        const res = await fetch('/api/events/demand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId,
            productId: selectedProductId,
            rawItemDescription: inputText || `${quantity} units of ${selectedProduct?.variant}`,
            variant: selectedProduct?.variant,
            quantity,
            requiredBy: requiredByDate ? new Date(requiredByDate).toISOString() : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            failureReason,
            source: 'WALK_IN',
            confirmationState,
            customerName: customerName || 'Art Student',
            customerContact,
            idempotencyKey: `IDEM-DEMAND-${Date.now()}`,
          }),
        });

        const data = await res.json();
        if (data.success) {
          playPaytmSoundboxChime('Customer demand recorded.');
          setStatusMessage({
            type: 'success',
            text: `Missed customer demand for ${quantity} units recorded! Confirmation state: ${confirmationState}.`,
          });
          setInputText('');
          setCustomerName('');
          setCustomerContact('');
          setCapturedImagePreview(null);
          onEventCreated();
        } else {
          setStatusMessage({ type: 'error', text: data.error || 'Failed to record demand' });
        }
      } else if (eventType === 'QUOTE') {
        const validUntil = validUntilDate ? new Date(validUntilDate) : new Date(Date.now() + 3 * 24 * 3600 * 1000);

        const res = await fetch('/api/events/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId,
            supplierId: selectedSupplierId,
            productId: selectedProductId,
            variant: selectedProduct?.variant || 'Standard',
            unitCostPaise: rupeesToPaise(unitPriceRupees),
            packSize,
            minOrderQuantity: minOrderQty,
            availableQuantity: availableQty,
            actionCostPaise: rupeesToPaise(actionCostRupees),
            deliveryLeadHours,
            validUntil: validUntil.toISOString(),
            notes: notes || inputText || 'Supplier wholesale quotation',
            idempotencyKey: `IDEM-QUOTE-${Date.now()}`,
          }),
        });

        const data = await res.json();
        if (data.success) {
          playPaytmSoundboxChime('Supplier quote registered.');
          setStatusMessage({
            type: 'success',
            text: `Supplier quote recorded! Valid until ${validUntil.toLocaleDateString()}. Eligible for decision engine.`,
          });
          setInputText('');
          setCapturedImagePreview(null);
          onEventCreated();
        } else {
          setStatusMessage({ type: 'error', text: data.error || 'Failed to save quote' });
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Submission failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hidden File Input for Image/Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <span>Record Business Events</span>
            <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-medium">
              Multimodal Input: Type • Voice • Camera Photo
            </span>
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Type notes freely, speak in Hindi/English, scan bills with your camera, or upload invoices. Everything is 100% editable before saving.
          </p>
        </div>

        {/* Paytm Soundbox Indicator */}
        <div className="flex items-center gap-1.5 bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md text-xs border border-stone-200 self-start sm:self-auto font-medium">
          <Volume2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Paytm Soundbox Audio Active</span>
        </div>
      </div>

      {/* Primary Event Mode Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => {
            setEventType('SALE');
            setExtractedSourceTag(null);
          }}
          className={`flex-1 sm:flex-initial px-6 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            eventType === 'SALE'
              ? 'border-stone-900 text-stone-900 bg-stone-50'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          1. Record a sale (बिक्री दर्ज करें)
        </button>
        <button
          onClick={() => {
            setEventType('DEMAND');
            setExtractedSourceTag(null);
          }}
          className={`flex-1 sm:flex-initial px-6 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            eventType === 'DEMAND'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          2. Customer asked for… (ग्राहक की मांग)
        </button>
        <button
          onClick={() => {
            setEventType('QUOTE');
            setExtractedSourceTag(null);
          }}
          className={`flex-1 sm:flex-initial px-6 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            eventType === 'QUOTE'
              ? 'border-teal-600 text-teal-900 bg-teal-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          3. Add supplier quote (सप्लायर कोटेशन)
        </button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`p-3 rounded-md text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-teal-50 text-teal-900 border-teal-300'
              : statusMessage.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-700" />
            ) : (
              <Info className="w-4 h-4 text-blue-700" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Active Voice Recording Indicator Strip */}
      {isRecording && (
        <div className="bg-rose-50 border-2 border-rose-400 text-rose-950 px-4 py-3 rounded-lg text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
            </span>
            <div>
              <span className="font-bold text-rose-900 block sm:inline">
                Microphone Active • Speak in Hindi or English
              </span>
              <span className="text-[11px] text-rose-700 sm:ml-2">
                (Recording live audio. Click Done when finished speaking)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={stopVoice}
            className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-md font-bold text-xs sm:text-sm shadow flex items-center gap-1.5 self-end sm:self-auto transition"
          >
            <span>⏹ Done Speaking</span>
          </button>
        </div>
      )}

      {/* Captured Image Preview Bar */}
      {capturedImagePreview && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <img
              src={capturedImagePreview}
              alt="Bill Preview"
              className="w-14 h-14 object-cover rounded-md border border-teal-300 shadow-sm"
            />
            <div>
              <div className="font-bold text-teal-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Invoice / Bill Photo Captured</span>
              </div>
              <p className="text-[11px] text-teal-700 mt-0.5">
                Analyzed and transcribed into editable canvas below. You can modify any number before saving.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCapturedImagePreview(null)}
            className="text-teal-700 hover:text-teal-900 font-bold p-1 text-xs"
            title="Remove photo"
          >
            ✕ Remove
          </button>
        </div>
      )}

      {/* UNIFIED INPUT CANVAS (Type, Voice, or Photo all feed into this editable area) */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Unified Natural Input (Type, Speak or Camera Photo)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {extractedSourceTag && (
              <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-mono">
                Source: {extractedSourceTag}
              </span>
            )}
            <span className="text-[11px] text-stone-400">
              {inputOrigin === 'VOICE' ? '🎤 Voice Transcript' : inputOrigin === 'BILL' ? '📄 Bill Text' : '⌨ Typed Notes'}
            </span>
          </div>
        </div>

        {/* Textarea - ALWAYS EDITABLE AT ALL TIMES */}
        <div className="relative">
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setInputOrigin('TYPED');
            }}
            placeholder={
              eventType === 'QUOTE'
                ? 'Type, speak or snap photo of quote: "A3 plain ka bundle 12 pieces, 80 rupaye per piece, 30 delivery, kal 4 baje tak."'
                : eventType === 'DEMAND'
                ? 'Type, speak or record demand: "A3 plain drawing book chahiye thi 12 pieces fine arts student ko kal sham tak, stock khatam tha"'
                : 'Type, speak or snap receipt: "Sold 2 A4 ruled notebooks for 130 cash"'
            }
            className="w-full text-xs sm:text-sm p-3.5 pr-32 border border-stone-300 rounded-md bg-[#FAF9F6] focus:bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
          />

          {/* Multimodal Action Buttons: Mic, Live Camera, and Photo Upload */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
            {/* Live Camera Scanner Button */}
            <button
              type="button"
              onClick={openCamera}
              title="Open Live Camera Scanner"
              className="p-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition shadow-sm"
            >
              <Camera className="w-4 h-4 text-teal-700" />
            </button>

            {/* Photo / Invoice File Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload Photo / Invoice Image"
              className="p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition shadow-sm"
            >
              <Image className="w-4 h-4 text-sky-700" />
            </button>

            {/* Microphone Voice Capture Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isRecording ? 'Click to stop recording' : 'Click to speak Hindi / English'}
              className={`p-2 rounded-lg transition shadow-sm ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-teal-700" />}
            </button>
          </div>
        </div>

        {/* Quick Toolbar: Parse Button + Suggestions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Sample Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
            <span className="text-[11px] font-semibold text-stone-600">Quick suggestions:</span>
            {samplePrompts[eventType].map((sp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputText(sp.text);
                  handleAnalyzeText(sp.text, eventType, 'TYPED');
                }}
                className="text-[10px] bg-stone-100 hover:bg-teal-50 hover:text-teal-900 border border-stone-200 px-2 py-0.5 rounded transition"
              >
                {sp.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAnalyzeText(inputText, eventType, inputOrigin)}
              disabled={isExtracting || !inputText.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold disabled:opacity-50 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              {isExtracting ? 'Analyzing...' : 'Parse & Sync Form'}
            </button>
          </div>
        </div>

        {/* Verified Bill Fixtures Strip */}
        <div className="bg-stone-50 p-3 rounded-md border border-stone-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-700 flex items-center gap-1">
              <Upload className="w-3.5 h-3.5 text-teal-600" />
              Pre-loaded Verified Bill/Challan Samples:
            </span>
            <span className="text-[10px] text-stone-500">Instant test fixtures for demonstration</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSelectBillFixture('fixture-supplier-a')}
              className="px-2.5 py-1 bg-white border border-stone-300 rounded text-stone-800 hover:border-teal-600 hover:bg-teal-50 text-[11px] font-medium"
            >
              📄 Supplier A Invoice (12 A3 Sketchbooks @ ₹80 + ₹30 delivery)
            </button>
            <button
              type="button"
              onClick={() => handleSelectBillFixture('fixture-supplier-b')}
              className="px-2.5 py-1 bg-white border border-stone-300 rounded text-stone-800 hover:border-teal-600 hover:bg-teal-50 text-[11px] font-medium"
            >
              📄 Supplier B Memo (6 A3 Sketchbooks @ ₹85 + ₹30 delivery)
            </button>
            <button
              type="button"
              onClick={() => handleSelectBillFixture('fixture-sale-receipt')}
              className="px-2.5 py-1 bg-white border border-stone-300 rounded text-stone-800 hover:border-teal-600 hover:bg-teal-50 text-[11px] font-medium"
            >
              🧾 Retail Cash Slip (2 A4 Ruled Notebooks @ ₹65)
            </button>
          </div>
        </div>
      </div>

      {/* EDITABLE REVIEW FORM (The merchant controls every value before saving) */}
      <form onSubmit={handleCommit} className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Editable Review Before Confirmation
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Review and adjust numbers below. Saving here updates the stock ledger atomically.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
            {eventType} Review
          </span>
        </div>

        {/* Common Field: Product Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Select Product & Variant *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.variant}) — {p.sku} [Stock: {p.onHandQuantity}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => handleQuantityChange(Number(e.target.value))}
              className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-bold"
            />
          </div>
        </div>

        {/* SALE SPECIFIC FIELDS */}
        {eventType === 'SALE' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-100">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Unit Selling Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={unitPriceRupees}
                onChange={(e) => handleUnitPriceChange(Number(e.target.value))}
                className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Total Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={totalPriceRupees}
                onChange={(e) => handleTotalPriceChange(Number(e.target.value))}
                className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600 font-bold text-teal-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
              >
                <option value="CASH">Cash (नकदी)</option>
                <option value="UPI_PAYTM">Paytm QR / Soundbox (UPI)</option>
                <option value="KHATA_DUE">Khata / Credit (उधार)</option>
              </select>
            </div>
          </div>
        )}

        {/* DEMAND SPECIFIC FIELDS */}
        {eventType === 'DEMAND' && (
          <div className="space-y-4 pt-2 border-t border-stone-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Customer Commitment State *
                </label>
                <select
                  value={confirmationState}
                  onChange={(e: any) => setConfirmationState(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600 font-semibold"
                >
                  <option value="CONFIRMED_COMMITMENT">Confirmed Commitment (पक्का वादा)</option>
                  <option value="ENQUIRY">General Enquiry Only (सिर्फ पूछताछ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Failure Reason *
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
                >
                  <option value="OUT_OF_STOCK">Out of Stock (स्टॉक खत्म)</option>
                  <option value="INSUFFICIENT_QUANTITY">Insufficient Quantity</option>
                  <option value="NOT_STOCKED">Item Not Stocked</option>
                  <option value="PRICE_UNMATCHED">Price Unmatched</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Required By Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={requiredByDate}
                  onChange={(e) => setRequiredByDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Customer Phone / Contact
                </label>
                <input
                  type="text"
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* QUOTE SPECIFIC FIELDS */}
        {eventType === 'QUOTE' && (
          <div className="space-y-4 pt-2 border-t border-stone-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Select Supplier *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.contact})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Quoted Unit Cost (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={unitPriceRupees}
                  onChange={(e) => setUnitPriceRupees(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Delivery / Action Cost (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={actionCostRupees}
                  onChange={(e) => setActionCostRupees(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Pack Size (pcs)
                </label>
                <input
                  type="number"
                  min="1"
                  value={packSize}
                  onChange={(e) => setPackSize(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Min Order Qty (MOQ)
                </label>
                <input
                  type="number"
                  min="1"
                  value={minOrderQty}
                  onChange={(e) => setMinOrderQty(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Lead Time (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={deliveryLeadHours}
                  onChange={(e) => setDeliveryLeadHours(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Quote Valid Until
                </label>
                <input
                  type="datetime-local"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Common Field: Notes */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Merchant Transaction Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional additional context or customer instructions..."
            className="w-full text-xs p-2.5 border border-stone-300 rounded-md focus:border-teal-600"
          />
        </div>

        {/* Submission Button */}
        <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            {eventType === 'SALE' && '✓ Confirmed sale reduces recorded stock atomically.'}
            {eventType === 'DEMAND' && '✓ Demands are evaluated in purchase engine (never assumes guaranteed sales).'}
            {eventType === 'QUOTE' && '✓ Supplier quote does not alter stock until order is approved & received.'}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting
              ? 'Recording...'
              : eventType === 'SALE'
              ? 'Confirm & Save Sale'
              : eventType === 'DEMAND'
              ? 'Save Demand Request'
              : 'Save Supplier Quote'}
          </button>
        </div>
      </form>

      {/* LIVE CAMERA VIEWFINDER MODAL */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-[#002970] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#00BAF2]" />
                <span className="font-bold text-sm tracking-tight">Live Camera Invoice Scanner</span>
              </div>
              <button
                onClick={closeCamera}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewfinder Video */}
            <div className="p-4 bg-slate-950 relative aspect-[4/3] flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-lg"
              />
              {/* Document Alignment Overlay */}
              <div className="absolute inset-8 border-2 border-dashed border-[#00BAF2]/80 rounded-xl pointer-events-none flex items-center justify-center shadow-inner">
                <span className="text-[11px] text-white bg-black/70 px-3 py-1 rounded-full font-semibold">
                  Align Invoice or Memo here
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={closeCamera}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={capturePhotoSnapshot}
                className="px-5 py-2.5 bg-[#002970] hover:bg-[#001D4F] text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                <Camera className="w-4 h-4 text-[#00BAF2]" />
                <span>Snap Photo & Extract</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
