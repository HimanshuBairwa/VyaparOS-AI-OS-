import { pipeline, env } from '@xenova/transformers';

// On Vercel or serverless environments, redirect Hugging Face cache to /tmp (only writable directory)
if (typeof process !== 'undefined') {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    env.cacheDir = '/tmp/transformers-cache';
  }
}

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
 * Includes safety timeout to prevent serverless function hangs.
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

  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('Whisper timeout')), 4500)
  );

  try {
    const transcriber = await getLocalWhisperTranscriber();
    const out = await Promise.race([
      transcriber(pcmFloats, {
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      }),
      timeoutPromise,
    ]);

    return (out?.text || '').trim();
  } catch (err) {
    console.warn('Local Whisper transcription notice:', err);
    return '';
  }
}
