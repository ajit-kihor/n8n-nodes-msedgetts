import { Readable } from 'node:stream';

import { MsEdgeTTS } from 'msedge-tts';

import { synthesizeSpeech } from '../../nodes/MsEdgeTts/speech';

jest.mock('msedge-tts');

function streamFromChunks(chunks: Buffer[]): Readable {
	return Readable.from(chunks);
}

describe('speech utility', () => {
	it('synthesizes speech with default prosody options', async () => {
		const setMetadata = jest.fn().mockResolvedValue(undefined);
		const toStream = jest.fn().mockReturnValue({
			audioStream: streamFromChunks([Buffer.from('audio-1'), Buffer.from('audio-2')]),
			metadataStream: null,
		});
		(MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({ setMetadata, toStream }));

		const result = await synthesizeSpeech('Hello world', {
			voice: 'en-US-JennyNeural',
		});

		expect(result.toString()).toBe('audio-1audio-2');
		expect(setMetadata).toHaveBeenCalledWith('en-US-JennyNeural', expect.any(String));
		expect(toStream).toHaveBeenCalledWith('Hello world', {
			rate: '+0%',
			pitch: '+0Hz',
			volume: '+0%',
		});
	});

	it('passes custom prosody settings', async () => {
		const toStream = jest.fn().mockReturnValue({
			audioStream: streamFromChunks([Buffer.from('audio')]),
			metadataStream: null,
		});
		(MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({
			setMetadata: jest.fn().mockResolvedValue(undefined),
			toStream,
		}));

		await synthesizeSpeech('Hello world', {
			voice: 'hi-IN-SwaraNeural',
			rate: '+20%',
			pitch: '-10Hz',
			volume: '+5%',
		});

		expect(toStream).toHaveBeenCalledWith('Hello world', {
			rate: '+20%',
			pitch: '-10Hz',
			volume: '+5%',
		});
	});

	it('rejects empty text and voice values', async () => {
		await expect(synthesizeSpeech('', { voice: 'en-US-JennyNeural' })).rejects.toThrow(
			'Text to synthesize cannot be empty',
		);
		await expect(synthesizeSpeech('Hello', { voice: '   ' })).rejects.toThrow(
			'Voice cannot be empty',
		);
	});

	it('rejects when synthesis times out', async () => {
		const audioStream = new Readable({ read() {} });
		(MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({
			setMetadata: jest.fn().mockResolvedValue(undefined),
			toStream: jest.fn().mockReturnValue({ audioStream, metadataStream: null }),
		}));

		await expect(
			synthesizeSpeech('Hello', { voice: 'en-US-JennyNeural', timeoutMs: 10 }),
		).rejects.toThrow('Speech synthesis timed out after 10 ms');
	});
});
