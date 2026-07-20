/* eslint-disable @typescript-eslint/no-explicit-any */
import { MsEdgeTts } from '../../nodes/MsEdgeTts/MsEdgeTts.node';
import * as speechUtils from '../../utils/speech';
import * as voicesUtils from '../../utils/voices';
import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

jest.mock('../../utils/speech');
jest.mock('../../utils/voices');

describe('MsEdgeTts Node', () => {
  let node: MsEdgeTts;

  beforeEach(() => {
    node = new MsEdgeTts();
  });

  describe('operation = generateSpeech', () => {
    it('should generate speech with default options', async () => {
      const mockSynthesizeSpeech = jest
        .spyOn(speechUtils, 'synthesizeSpeech')
        .mockResolvedValue(Buffer.from('synthesized-audio'));

      const mockInputData: INodeExecutionData[] = [
        {
          json: { someInputKey: 'inputValue' },
        },
      ];

      const mockParams: { [key: string]: any } = {
        operation: 'generateSpeech',
        text: 'Test Speech Text',
        voice: 'en-US-JennyNeural',
        adjustVoiceSettings: false,
      };

      const mockContext = {
        getInputData: () => mockInputData,
        getNodeParameter: (name: string, index: number, fallback?: any) => {
          return mockParams[name] !== undefined ? mockParams[name] : fallback;
        },
        getNode: () => ({}),
        continueOnFail: () => false,
      } as unknown as IExecuteFunctions;

      const result = await node.execute.call(mockContext);

      expect(result).toBeDefined();
      expect(result[0]).toHaveLength(1);

      const outputItem = result[0][0];
      expect(outputItem.json).toEqual({ someInputKey: 'inputValue' });
      expect(outputItem.binary).toBeDefined();
      expect(outputItem.binary!.audio).toBeDefined();
      expect(outputItem.binary!.audio.fileName).toBe('audio.mp3');
      expect(outputItem.binary!.audio.mimeType).toBe('audio/mpeg');
      expect(outputItem.binary!.audio.data).toBe(Buffer.from('synthesized-audio').toString('base64'));

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith('Test Speech Text', {
        voice: 'en-US-JennyNeural',
        rate: undefined,
        pitch: undefined,
        volume: undefined,
      });
    });

    it('should use custom voice when voice = custom', async () => {
      const mockSynthesizeSpeech = jest
        .spyOn(speechUtils, 'synthesizeSpeech')
        .mockResolvedValue(Buffer.from('audio-data'));

      const mockInputData: INodeExecutionData[] = [{ json: {} }];

      const mockParams: { [key: string]: any } = {
        operation: 'generateSpeech',
        text: 'Custom Voice Text',
        voice: 'custom',
        customVoice: 'hi-IN-MadhurNeural',
        adjustVoiceSettings: false,
      };

      const mockContext = {
        getInputData: () => mockInputData,
        getNodeParameter: (name: string, index: number, fallback?: any) => {
          return mockParams[name] !== undefined ? mockParams[name] : fallback;
        },
        getNode: () => ({}),
        continueOnFail: () => false,
      } as unknown as IExecuteFunctions;

      await node.execute.call(mockContext);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith('Custom Voice Text', {
        voice: 'hi-IN-MadhurNeural',
        rate: undefined,
        pitch: undefined,
        volume: undefined,
      });
    });

    it('should map adjustVoiceSettings to prosody strings', async () => {
      const mockSynthesizeSpeech = jest
        .spyOn(speechUtils, 'synthesizeSpeech')
        .mockResolvedValue(Buffer.from('audio-data'));

      const mockInputData: INodeExecutionData[] = [{ json: {} }];

      const mockParams: { [key: string]: any } = {
        operation: 'generateSpeech',
        text: 'Adjust Voice Text',
        voice: 'en-US-JennyNeural',
        adjustVoiceSettings: true,
        rate: 20,
        pitch: -30,
        volume: 5,
      };

      const mockContext = {
        getInputData: () => mockInputData,
        getNodeParameter: (name: string, index: number, fallback?: any) => {
          return mockParams[name] !== undefined ? mockParams[name] : fallback;
        },
        getNode: () => ({}),
        continueOnFail: () => false,
      } as unknown as IExecuteFunctions;

      await node.execute.call(mockContext);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith('Adjust Voice Text', {
        voice: 'en-US-JennyNeural',
        rate: '+20%',
        pitch: '-30Hz',
        volume: '+5%',
      });
    });
  });

  describe('operation = listVoices', () => {
    it('should return normalized voices list', async () => {
      const mockVoices = [{ name: 'en-US-JennyNeural', locale: 'en-US', gender: 'Female' }];
      const mockGetNormalizedVoices = jest.spyOn(voicesUtils, 'getNormalizedVoices').mockResolvedValue(mockVoices);

      const mockInputData: INodeExecutionData[] = [{ json: {} }];

      const mockParams: { [key: string]: any } = {
        operation: 'listVoices',
      };

      const mockContext = {
        getInputData: () => mockInputData,
        getNodeParameter: (name: string, index: number, fallback?: any) => {
          return mockParams[name] !== undefined ? mockParams[name] : fallback;
        },
        getNode: () => ({}),
        continueOnFail: () => false,
      } as unknown as IExecuteFunctions;

      const result = await node.execute.call(mockContext);

      expect(result).toBeDefined();
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json).toEqual({ voices: mockVoices });
      expect(mockGetNormalizedVoices).toHaveBeenCalledTimes(1);
    });
  });
});
