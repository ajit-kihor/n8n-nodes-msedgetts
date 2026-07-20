import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { synthesizeSpeech } from './speech';
import { getNormalizedVoices } from './voices';

type Operation = 'generateSpeech' | 'listVoices';

function asError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

export class MsEdgeTts implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Edge TTS',
		name: 'msEdgeTts',
		icon: {
			light: 'file:msedgetts.svg',
			dark: 'file:msedgetts.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Generate speech from text using Microsoft Edge text-to-speech',
		defaults: {
			name: 'Microsoft Edge TTS',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generate Speech',
						value: 'generateSpeech',
						action: 'Generate speech',
						description: 'Convert text into MP3 audio',
					},
					{
						name: 'List Voices',
						value: 'listVoices',
						action: 'List voices',
						description: 'Retrieve the available Microsoft Edge TTS voices',
					},
				],
				default: 'generateSpeech',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['generateSpeech'],
					},
				},
				placeholder: 'e.g. Welcome to my n8n workflow',
				description: 'Text to convert into speech; expressions are supported',
			},
			{
				displayName: 'Voice',
				name: 'voice',
				type: 'options',
				default: 'en-US-JennyNeural',
				displayOptions: {
					show: {
						operation: ['generateSpeech'],
					},
				},
				options: [
					{
						name: 'Custom',
						value: 'custom',
					},
					{
						name: 'English (US) - Guy (Male)',
						value: 'en-US-GuyNeural',
					},
					{
						name: 'English (US) - Jenny (Female)',
						value: 'en-US-JennyNeural',
					},
					{
						name: 'Hindi (India) - Madhur (Male)',
						value: 'hi-IN-MadhurNeural',
					},
					{
						name: 'Hindi (India) - Swara (Female)',
						value: 'hi-IN-SwaraNeural',
					},
				],
				description: 'Voice to use for speech generation',
			},
			{
				displayName: 'Custom Voice Name',
				name: 'customVoice',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['generateSpeech'],
						voice: ['custom'],
					},
				},
				placeholder: 'e.g. en-GB-SoniaNeural',
				description: 'Microsoft Edge TTS voice identifier returned by List Voices',
			},
			{
				displayName: 'Adjust Voice Settings',
				name: 'adjustVoiceSettings',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['generateSpeech'],
					},
				},
				description: 'Whether to adjust the speech rate, pitch, and volume',
			},
			{
				displayName: 'Rate',
				name: 'rate',
				type: 'number',
				typeOptions: {
					minValue: -100,
					maxValue: 100,
					numberPrecision: 0,
				},
				default: 0,
				displayOptions: {
					show: {
						operation: ['generateSpeech'],
						adjustVoiceSettings: [true],
					},
				},
				description: 'Speaking speed relative to the voice default, from -100% to 100%',
			},
			{
				displayName: 'Pitch',
				name: 'pitch',
				type: 'number',
				typeOptions: {
					minValue: -100,
					maxValue: 100,
					numberPrecision: 0,
				},
				default: 0,
				displayOptions: {
					show: {
						operation: ['generateSpeech'],
						adjustVoiceSettings: [true],
					},
				},
				description: 'Baseline pitch adjustment in hertz, from -100 to 100',
			},
			{
				displayName: 'Volume',
				name: 'volume',
				type: 'number',
				typeOptions: {
					minValue: -100,
					maxValue: 100,
					numberPrecision: 0,
				},
				default: 0,
				displayOptions: {
					show: {
						operation: ['generateSpeech'],
						adjustVoiceSettings: [true],
					},
				},
				description: 'Volume relative to the voice default, from -100% to 100%',
			},
			{
				displayName: 'Output Binary Field',
				name: 'outputBinaryField',
				type: 'string',
				default: 'audio',
				required: true,
				displayOptions: {
					show: {
						operation: ['generateSpeech'],
					},
				},
				description: 'Name of the output binary field that contains the MP3 audio',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: 'audio.mp3',
				required: true,
				displayOptions: {
					show: {
						operation: ['generateSpeech'],
					},
				},
				placeholder: 'e.g. welcome.mp3',
				description: 'File name to assign to the generated MP3 audio',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as Operation;

		if (operation === 'listVoices') {
			try {
				const voices = await getNormalizedVoices();

				return [
					items.map((item, itemIndex) => ({
						json: {
							...item.json,
							voices,
						},
						binary: item.binary,
						pairedItem: { item: itemIndex },
					})),
				];
			} catch (error) {
				const normalizedError = asError(error);

				if (this.continueOnFail()) {
					return [
						items.map((item, itemIndex) => ({
							json: {
								...item.json,
								error: normalizedError.message,
							},
							binary: item.binary,
							pairedItem: { item: itemIndex },
						})),
					];
				}

				throw new NodeOperationError(this.getNode(), normalizedError, { itemIndex: 0 });
			}
		}

		if (operation !== 'generateSpeech') {
			throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
		}

		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const text = this.getNodeParameter('text', itemIndex) as string;
				let voice = this.getNodeParameter('voice', itemIndex) as string;
				const outputBinaryField = (
					this.getNodeParameter('outputBinaryField', itemIndex) as string
				).trim();
				const fileName = (this.getNodeParameter('fileName', itemIndex) as string).trim();

				if (voice === 'custom') {
					voice = this.getNodeParameter('customVoice', itemIndex) as string;
				}

				voice = voice.trim();

				if (!outputBinaryField) {
					throw new NodeOperationError(this.getNode(), 'Output Binary Field cannot be empty', {
						itemIndex,
					});
				}

				if (!fileName) {
					throw new NodeOperationError(this.getNode(), 'File Name cannot be empty', {
						itemIndex,
					});
				}

				const adjustVoiceSettings = this.getNodeParameter(
					'adjustVoiceSettings',
					itemIndex,
					false,
				) as boolean;
				let rate: string | undefined;
				let pitch: string | undefined;
				let volume: string | undefined;

				if (adjustVoiceSettings) {
					const rateNumber = this.getNodeParameter('rate', itemIndex, 0) as number;
					const pitchNumber = this.getNodeParameter('pitch', itemIndex, 0) as number;
					const volumeNumber = this.getNodeParameter('volume', itemIndex, 0) as number;

					rate = rateNumber >= 0 ? `+${rateNumber}%` : `${rateNumber}%`;
					pitch = pitchNumber >= 0 ? `+${pitchNumber}Hz` : `${pitchNumber}Hz`;
					volume = volumeNumber >= 0 ? `+${volumeNumber}%` : `${volumeNumber}%`;
				}

				const audioBuffer = await synthesizeSpeech(text, {
					voice,
					rate,
					pitch,
					volume,
				});
				const binaryData = await this.helpers.prepareBinaryData(
					audioBuffer,
					fileName,
					'audio/mpeg',
				);

				returnData.push({
					json: {
						...items[itemIndex].json,
					},
					binary: {
						...items[itemIndex].binary,
						[outputBinaryField]: binaryData,
					},
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				const normalizedError = asError(error);

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							...items[itemIndex].json,
							error: normalizedError.message,
						},
						binary: items[itemIndex].binary,
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				throw new NodeOperationError(this.getNode(), normalizedError, { itemIndex });
			}
		}

		return [returnData];
	}
}
