import { getNormalizedVoices } from '../../utils/voices';
import { MsEdgeTTS } from 'msedge-tts';

jest.mock('msedge-tts');

describe('voices utility', () => {
  it('should fetch and normalize voices correctly', async () => {
    const mockGetVoices = jest.fn().mockResolvedValue([
      {
        ShortName: 'en-US-JennyNeural',
        Locale: 'en-US',
        Gender: 'Female',
        Name: 'Microsoft Server Speech Text to Speech Voice (en-US, JennyNeural)',
        SuggestedCodec: 'audio-24khz-48kbitrate-mono-mp3',
        FriendlyName: 'Microsoft Jenny Online (Natural) - English (United States)',
        Status: 'GA',
      },
      {
        ShortName: 'hi-IN-SwaraNeural',
        Locale: 'hi-IN',
        Gender: 'Female',
        Name: 'Microsoft Server Speech Text to Speech Voice (hi-IN, SwaraNeural)',
        SuggestedCodec: 'audio-24khz-48kbitrate-mono-mp3',
        FriendlyName: 'Microsoft Swara Online (Natural) - Hindi (India)',
        Status: 'GA',
      },
    ]);

    (MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({
      getVoices: mockGetVoices,
    }));

    const result = await getNormalizedVoices();

    expect(result).toEqual([
      { name: 'en-US-JennyNeural', locale: 'en-US', gender: 'Female' },
      { name: 'hi-IN-SwaraNeural', locale: 'hi-IN', gender: 'Female' },
    ]);
    expect(mockGetVoices).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if the library returns a malformed response', async () => {
    (MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({
      getVoices: jest.fn().mockResolvedValue(null),
    }));

    await expect(getNormalizedVoices()).rejects.toThrow('Invalid voice list returned');
  });
});
