import { MsEdgeTTS } from 'msedge-tts';

import { getNormalizedVoices } from '../../nodes/MsEdgeTts/voices';

jest.mock('msedge-tts');

describe('voices utility', () => {
	it('normalizes and sorts voices', async () => {
		const getVoices = jest.fn().mockResolvedValue([
			{
				ShortName: 'hi-IN-SwaraNeural',
				Locale: 'hi-IN',
				Gender: 'Female',
				Name: 'Hindi voice',
			},
			{
				ShortName: 'en-US-JennyNeural',
				Locale: 'en-US',
				Gender: 'Female',
				Name: 'English voice',
			},
		]);
		(MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({ getVoices }));

		await expect(getNormalizedVoices()).resolves.toEqual([
			{ name: 'en-US-JennyNeural', locale: 'en-US', gender: 'Female' },
			{ name: 'hi-IN-SwaraNeural', locale: 'hi-IN', gender: 'Female' },
		]);
	});

	it('rejects empty voice lists', async () => {
		(MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({
			getVoices: jest.fn().mockResolvedValue([]),
		}));

		await expect(getNormalizedVoices()).rejects.toThrow('Microsoft Edge TTS returned no voices');
	});

	it('rejects malformed voice entries', async () => {
		(MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({
			getVoices: jest.fn().mockResolvedValue([{ ShortName: '', Locale: '', Gender: '' }]),
		}));

		await expect(getNormalizedVoices()).rejects.toThrow(
			'Microsoft Edge TTS returned an invalid voice at index 0',
		);
	});
});
