import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const DEFAULT_TIMEOUT_MS = 120_000;

export interface TTSOptions {
	voice: string;
	rate?: string;
	pitch?: string;
	volume?: string;
	timeoutMs?: number;
}

export async function synthesizeSpeech(text: string, options: TTSOptions): Promise<Buffer> {
	if (!text || text.trim() === '') {
		throw new Error('Text to synthesize cannot be empty');
	}

	const voice = options.voice.trim();
	if (!voice) {
		throw new Error('Voice cannot be empty');
	}

	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new Error('Speech synthesis timeout must be greater than zero');
	}

	const tts = new MsEdgeTTS();
	await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

	const { audioStream } = tts.toStream(text, {
		rate: options.rate ?? '+0%',
		pitch: options.pitch ?? '+0Hz',
		volume: options.volume ?? '+0%',
	});

	return await new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		let settled = false;

		const cleanup = () => {
			clearTimeout(timeout);
			audioStream.removeListener('data', onData);
			audioStream.removeListener('end', onEnd);
			audioStream.removeListener('error', onError);
			audioStream.removeListener('close', onClose);
		};

		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			cleanup();

			if (error) {
				reject(error);
				return;
			}

			const audio = Buffer.concat(chunks);
			if (audio.length === 0) {
				reject(new Error('Synthesized audio is empty; check the voice and try again'));
				return;
			}

			resolve(audio);
		};

		const onData = (chunk: Buffer | Uint8Array | string) => {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		};
		const onEnd = () => finish();
		const onError = (error: Error) => finish(error);
		const onClose = () => finish(new Error('Audio stream closed before synthesis completed'));

		audioStream.on('data', onData);
		audioStream.once('end', onEnd);
		audioStream.once('error', onError);
		audioStream.once('close', onClose);

		const timeout = setTimeout(() => {
			audioStream.destroy();
			finish(new Error(`Speech synthesis timed out after ${timeoutMs} ms`));
		}, timeoutMs);
	});
}
