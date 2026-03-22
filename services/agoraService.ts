import api from './api';

export const getAgoraToken = async (channelName: string): Promise<string> => {
  const response = await api.get<{ data: { token: string } }>('/agora/token', {
    params: { channelName },
  });
  return response.data.data.token;
};
