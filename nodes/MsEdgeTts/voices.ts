import { MsEdgeTTS } from 'msedge-tts';

export interface NormalizedVoice {
	name: string;
	locale: string;
	gender: string;
}

export async function getNormalizedVoices(): Promise<NormalizedVoice[]> {
	const tts = new MsEdgeTTS();
	const voices = await tts.getVoices();

	if (!Array.isArray(voices) || voices.length === 0) {
		throw new Error('Microsoft Edge TTS returned no voices');
	}

	return voices
		.map((voice, index) => {
			const name = (voice.ShortName || voice.Name || '').trim();
			const locale = (voice.Locale || '').trim();
			const gender = (voice.Gender || '').trim();

			if (!name || !locale || !gender) {
				throw new Error(`Microsoft Edge TTS returned an invalid voice at index ${index}`);
			}

			return { name, locale, gender };
		})
		.sort((left, right) => left.name.localeCompare(right.name));
}
