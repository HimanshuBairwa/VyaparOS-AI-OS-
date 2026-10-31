import { pipeline } from '@xenova/transformers';

let transcriberPromise: Promise<any> | null = null;

export async function getLocalWhisperTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      quantized: true,
    });
  }
  return transcriberPromise;
}

/**
 * Transcribe raw 16kHz mono Float32Array PCM audio using local Whisper.
 * Completely local, zero external cloud dependency, zero firewall block risk.
 */
export async function transcribePcmAudio(pcmFloats: Float32Array): Promise<string> {
  if (!pcmFloats || pcmFloats.length === 0) {
    return '';
  }

  // Check audio energy/amplitude to avoid transcribing pure silence
  let maxAmp = 0;
  for (let i = 0; i < pcmFloats.length; i++) {
    const abs = Math.abs(pcmFloats[i]);
    if (abs > maxAmp) maxAmp = abs;
  }

  // If maximum amplitude is below noise floor (e.g. 0.01), treat as silence
  if (maxAmp < 0.01) {
    return '';
  }

  const transcriber = await getLocalWhisperTranscriber();
  const out = await transcriber(pcmFloats, {
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  return (out?.text || '').trim();
}
