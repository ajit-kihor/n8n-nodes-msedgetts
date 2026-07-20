import { MsEdgeTTS } from 'msedge-tts';

export interface NormalizedVoice {
  name: string;
  locale: string;
  gender: string;
}

/**
 * Fetches available voices from MsEdgeTTS and normalizes them.
 */
export async function getNormalizedVoices(): Promise<NormalizedVoice[]> {
  const tts = new MsEdgeTTS();
  const voices = await tts.getVoices();

  if (!voices || !Array.isArray(voices)) {
    throw new Error('Invalid voice list returned from Edge TTS service.');
  }

  return voices.map((voice) => ({
    name: voice.ShortName || voice.Name,
    locale: voice.Locale,
    gender: voice.Gender,
  }));
}
