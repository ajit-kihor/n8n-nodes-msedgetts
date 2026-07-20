import { synthesizeSpeech } from '../../utils/speech';
import { MsEdgeTTS } from 'msedge-tts';
import { Readable } from 'stream';

jest.mock('msedge-tts');

describe('speech utility', () => {
  it('should synthesize speech correctly with default prosody options', async () => {
    const mockSetMetadata = jest.fn().mockResolvedValue(undefined);
    const mockToStream = jest.fn().mockImplementation(() => {
      const stream = new Readable();
      stream._read = () => {};
      setTimeout(() => {
        stream.push(Buffer.from('audio-chunk-1'));
        stream.push(Buffer.from('audio-chunk-2'));
        stream.push(null); // End of stream
        stream.emit('close');
      }, 10);
      return { audioStream: stream, metadataStream: null };
    });

    (MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({
      setMetadata: mockSetMetadata,
      toStream: mockToStream,
    }));

    const result = await synthesizeSpeech('Hello world', {
      voice: 'en-US-JennyNeural',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('audio-chunk-1audio-chunk-2');
    expect(mockSetMetadata).toHaveBeenCalledWith('en-US-JennyNeural', expect.any(String));
    expect(mockToStream).toHaveBeenCalledWith('Hello world', {
      rate: '+0%',
      pitch: '+0Hz',
      volume: '+0%',
    });
  });

  it('should pass correct mapped prosody settings', async () => {
    const mockSetMetadata = jest.fn().mockResolvedValue(undefined);
    const mockToStream = jest.fn().mockImplementation(() => {
      const stream = new Readable();
      stream._read = () => {};
      setTimeout(() => {
        stream.push(Buffer.from('audio'));
        stream.push(null);
        stream.emit('close');
      }, 10);
      return { audioStream: stream, metadataStream: null };
    });

    (MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({
      setMetadata: mockSetMetadata,
      toStream: mockToStream,
    }));

    await synthesizeSpeech('Hello world', {
      voice: 'hi-IN-SwaraNeural',
      rate: '+20%',
      pitch: '-10Hz',
      volume: '+5%',
    });

    expect(mockToStream).toHaveBeenCalledWith('Hello world', {
      rate: '+20%',
      pitch: '-10Hz',
      volume: '+5%',
    });
  });

  it('should throw an error for empty text', async () => {
    await expect(synthesizeSpeech('', { voice: 'en-US-JennyNeural' })).rejects.toThrow(
      'Text to synthesize cannot be empty',
    );
    await expect(synthesizeSpeech('   ', { voice: 'en-US-JennyNeural' })).rejects.toThrow(
      'Text to synthesize cannot be empty',
    );
  });
});
