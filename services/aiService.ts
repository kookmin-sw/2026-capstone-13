import api from './api';

export const getAiSpeechToken = async (): Promise<string> => {
  const response = await api.get<{ data: { token: string } }>('/ai/speech-token');
  return response.data.data.token;
};
