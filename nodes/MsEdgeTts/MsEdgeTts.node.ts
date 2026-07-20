import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import { synthesizeSpeech } from '../../utils/speech';
import { getNormalizedVoices } from '../../utils/voices';

export class MsEdgeTts implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Microsoft Edge TTS',
    name: 'msEdgeTts',
    icon: 'file:msedgetts.svg',
    group: ['transform'],
    version: 1,
    description: 'Generate speech from text using Microsoft Edge Text-to-Speech',
    defaults: {
      name: 'Microsoft Edge TTS',
      color: '#0078D4',
    },
    inputs: ['main'],
    outputs: ['main'],
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
            description: 'Convert text into MP3 audio speech',
          },
          {
            name: 'List Voices',
            value: 'listVoices',
            description: 'Fetch available Microsoft Edge TTS voices',
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
        description: 'Enter the text to synthesize as speech. Expressions are supported.',
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
            name: 'English (US) - Jenny (Female)',
            value: 'en-US-JennyNeural',
          },
          {
            name: 'English (US) - Guy (Male)',
            value: 'en-US-GuyNeural',
          },
          {
            name: 'Hindi (India) - Swara (Female)',
            value: 'hi-IN-SwaraNeural',
          },
          {
            name: 'Hindi (India) - Madhur (Male)',
            value: 'hi-IN-MadhurNeural',
          },
          {
            name: 'Custom Voice / Specify Identifier',
            value: 'custom',
          },
        ],
        description:
          'Select the voice to use. Choose "Custom Voice" to manually enter any valid Microsoft Edge voice identifier.',
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
        description:
          'Specify a valid Microsoft Edge voice identifier (e.g. hi-IN-MadhurNeural, en-GB-SoniaNeural). See "List Voices" operation for all options.',
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
        description: 'Whether to adjust speech rate, pitch, or volume (prosody settings).',
      },
      {
        displayName: 'Rate',
        name: 'rate',
        type: 'number',
        typeOptions: {
          minValue: -100,
          maxValue: 100,
        },
        default: 0,
        displayOptions: {
          show: {
            operation: ['generateSpeech'],
            adjustVoiceSettings: [true],
          },
        },
        description: 'Adjust the speaking speed relative to the voice default (-100% to +100%).',
      },
      {
        displayName: 'Pitch',
        name: 'pitch',
        type: 'number',
        typeOptions: {
          minValue: -100,
          maxValue: 100,
        },
        default: 0,
        displayOptions: {
          show: {
            operation: ['generateSpeech'],
            adjustVoiceSettings: [true],
          },
        },
        description: 'Adjust the baseline pitch of the speaking voice (-100Hz to +100Hz).',
      },
      {
        displayName: 'Volume',
        name: 'volume',
        type: 'number',
        typeOptions: {
          minValue: -100,
          maxValue: 100,
        },
        default: 0,
        displayOptions: {
          show: {
            operation: ['generateSpeech'],
            adjustVoiceSettings: [true],
          },
        },
        description: 'Adjust the speaking volume relative to the voice default (-100% to +100%).',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    if (operation === 'generateSpeech') {
      for (let i = 0; i < items.length; i++) {
        try {
          const text = this.getNodeParameter('text', i) as string;
          let voice = this.getNodeParameter('voice', i) as string;
          if (voice === 'custom') {
            voice = this.getNodeParameter('customVoice', i) as string;
          }

          const adjustVoiceSettings = this.getNodeParameter('adjustVoiceSettings', i, false) as boolean;
          let rate: string | undefined;
          let pitch: string | undefined;
          let volume: string | undefined;

          if (adjustVoiceSettings) {
            const rateNum = this.getNodeParameter('rate', i, 0) as number;
            const pitchNum = this.getNodeParameter('pitch', i, 0) as number;
            const volumeNum = this.getNodeParameter('volume', i, 0) as number;

            // Formats to "+0%", "+25%", "-10%" etc.
            rate = rateNum >= 0 ? `+${rateNum}%` : `${rateNum}%`;
            pitch = pitchNum >= 0 ? `+${pitchNum}Hz` : `${pitchNum}Hz`;
            volume = volumeNum >= 0 ? `+${volumeNum}%` : `${volumeNum}%`;
          }

          // Generate audio buffer
          const audioBuffer = await synthesizeSpeech(text, {
            voice,
            rate,
            pitch,
            volume,
          });

          // Convert to n8n binary format
          const base64Data = audioBuffer.toString('base64');

          const newItem: INodeExecutionData = {
            json: {
              ...items[i].json,
            },
            binary: {
              ...items[i].binary,
              audio: {
                data: base64Data,
                fileName: 'audio.mp3',
                mimeType: 'audio/mpeg',
              },
            },
          };

          returnData.push(newItem);
        } catch (error) {
          if (this.continueOnFail()) {
            returnData.push({
              json: {
                ...items[i].json,
                error: (error as Error).message,
              },
            });
          } else {
            throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
          }
        }
      }
    } else if (operation === 'listVoices') {
      try {
        const voices = await getNormalizedVoices();
        returnData.push({
          json: {
            voices,
          },
        });
      } catch (error) {
        throw new NodeOperationError(this.getNode(), error as Error);
      }
    }

    return [returnData];
  }
}
