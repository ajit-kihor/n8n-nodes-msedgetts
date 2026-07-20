import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { MsEdgeTts } from '../../nodes/MsEdgeTts/MsEdgeTts.node';
import * as speechUtils from '../../nodes/MsEdgeTts/speech';
import * as voicesUtils from '../../nodes/MsEdgeTts/voices';

jest.mock('../../nodes/MsEdgeTts/speech');
jest.mock('../../nodes/MsEdgeTts/voices');

const preparedAudio = {
	data: 'prepared-binary-data',
	fileName: 'audio.mp3',
	mimeType: 'audio/mpeg',
};

function createContext(
	inputData: INodeExecutionData[],
	parameters: Record<string, unknown>,
	continueOnFail = false,
) {
	return {
		getInputData: () => inputData,
		getNodeParameter: (name: string, _index: number, fallback?: unknown) =>
			parameters[name] ?? fallback,
		getNode: () => ({ name: 'Microsoft Edge TTS', type: 'msEdgeTts', typeVersion: 1 }),
		continueOnFail: () => continueOnFail,
		helpers: {
			prepareBinaryData: jest.fn().mockResolvedValue(preparedAudio),
		},
	} as unknown as IExecuteFunctions;
}

describe('MsEdgeTts node', () => {
	let node: MsEdgeTts;

	beforeEach(() => {
		node = new MsEdgeTts();
	});

	it('generates speech with n8n-managed binary data and item pairing', async () => {
		const synthesizeSpeech = jest
			.spyOn(speechUtils, 'synthesizeSpeech')
			.mockResolvedValue(Buffer.from('synthesized-audio'));
		const inputData: INodeExecutionData[] = [{ json: { input: 'value' } }];
		const context = createContext(inputData, {
			operation: 'generateSpeech',
			text: 'Test speech',
			voice: 'en-US-JennyNeural',
			adjustVoiceSettings: false,
			outputBinaryField: 'audio',
			fileName: 'audio.mp3',
		});

		const result = await node.execute.call(context);

		expect(result[0]).toEqual([
			{
				json: { input: 'value' },
				binary: { audio: preparedAudio },
				pairedItem: { item: 0 },
			},
		]);
		expect(context.helpers.prepareBinaryData).toHaveBeenCalledWith(
			Buffer.from('synthesized-audio'),
			'audio.mp3',
			'audio/mpeg',
		);
		expect(synthesizeSpeech).toHaveBeenCalledWith('Test speech', {
			voice: 'en-US-JennyNeural',
			rate: undefined,
			pitch: undefined,
			volume: undefined,
		});
	});

	it('uses a custom voice and maps prosody settings', async () => {
		const synthesizeSpeech = jest
			.spyOn(speechUtils, 'synthesizeSpeech')
			.mockResolvedValue(Buffer.from('audio'));
		const context = createContext([{ json: {} }], {
			operation: 'generateSpeech',
			text: 'Custom voice text',
			voice: 'custom',
			customVoice: 'hi-IN-MadhurNeural',
			adjustVoiceSettings: true,
			rate: 20,
			pitch: -30,
			volume: 5,
			outputBinaryField: 'speech',
			fileName: 'custom.mp3',
		});

		await node.execute.call(context);

		expect(synthesizeSpeech).toHaveBeenCalledWith('Custom voice text', {
			voice: 'hi-IN-MadhurNeural',
			rate: '+20%',
			pitch: '-30Hz',
			volume: '+5%',
		});
	});

	it('returns paired error items when continue on fail is enabled', async () => {
		jest.spyOn(speechUtils, 'synthesizeSpeech').mockRejectedValue(new Error('Service unavailable'));
		const inputData: INodeExecutionData[] = [{ json: { id: 1 } }, { json: { id: 2 } }];
		const context = createContext(
			inputData,
			{
				operation: 'generateSpeech',
				text: 'Test',
				voice: 'en-US-JennyNeural',
				adjustVoiceSettings: false,
				outputBinaryField: 'audio',
				fileName: 'audio.mp3',
			},
			true,
		);

		const result = await node.execute.call(context);

		expect(result[0]).toEqual([
			expect.objectContaining({
				json: { id: 1, error: 'Service unavailable' },
				pairedItem: { item: 0 },
			}),
			expect.objectContaining({
				json: { id: 2, error: 'Service unavailable' },
				pairedItem: { item: 1 },
			}),
		]);
	});

	it('lists voices for every input item and preserves item pairing', async () => {
		const voices = [{ name: 'en-US-JennyNeural', locale: 'en-US', gender: 'Female' }];
		jest.spyOn(voicesUtils, 'getNormalizedVoices').mockResolvedValue(voices);
		const context = createContext([{ json: { id: 1 } }, { json: { id: 2 } }], {
			operation: 'listVoices',
		});

		const result = await node.execute.call(context);

		expect(result[0]).toEqual([
			expect.objectContaining({ json: { id: 1, voices }, pairedItem: { item: 0 } }),
			expect.objectContaining({ json: { id: 2, voices }, pairedItem: { item: 1 } }),
		]);
		expect(voicesUtils.getNormalizedVoices).toHaveBeenCalledTimes(1);
	});
});
