import { NextResponse } from 'next/server';
import { transcribePcmAudio } from '@/lib/local-whisper';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { pcmBase64 } = body;

    if (!pcmBase64) {
      return NextResponse.json(
        { success: false, error: 'No audio data received. Please record your voice again.' },
        { status: 400 }
      );
    }

    // Decode Base64 to binary buffer and map to Float32Array
    const buffer = Buffer.from(pcmBase64, 'base64');
    const pcmFloats = new Float32Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.length / Float32Array.BYTES_PER_ELEMENT
    );

    if (pcmFloats.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Audio recording was empty. Please speak again.' },
        { status: 400 }
      );
    }

    // Transcribe with real local Whisper model
    const transcript = await transcribePcmAudio(pcmFloats);

    if (!transcript || transcript.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'No clear speech detected. Please speak closer to the microphone or type directly.',
      });
    }

    return NextResponse.json({
      success: true,
      transcript,
      source: 'Local Whisper AI',
    });
  } catch (err: any) {
    console.error('Audio transcription error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error transcribing audio.' },
      { status: 500 }
    );
  }
}
