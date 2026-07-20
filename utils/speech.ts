import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export interface TTSOptions {
  voice: string;
  rate?: string;
  pitch?: string;
  volume?: string;
}

/**
 * Synthesizes text into MP3 audio data and returns it as a Buffer.
 *
 * @param text The text to synthesize.
 * @param options Voice options including voice name, rate, pitch, and volume.
 */
export async function synthesizeSpeech(text: string, options: TTSOptions): Promise<Buffer> {
  if (!text || text.trim() === '') {
    throw new Error('Text to synthesize cannot be empty.');
  }

  const tts = new MsEdgeTTS();

  // Initialize connection and set voice/format
  // We use audio-24khz-48kbitrate-mono-mp3 as it is standard and high quality
  await tts.setMetadata(options.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const prosodyOptions = {
    rate: options.rate || '+0%',
    pitch: options.pitch || '+0Hz',
    volume: options.volume || '+0%',
  };

  const { audioStream } = tts.toStream(text, prosodyOptions);

  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    audioStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    audioStream.on('error', (error) => {
      reject(error);
    });

    audioStream.on('close', () => {
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        reject(new Error('Synthesized audio is empty. Check connection and try again.'));
      } else {
        resolve(buffer);
      }
    });
  });
}
export { OUTPUT_FORMAT } from 'msedge-tts';
