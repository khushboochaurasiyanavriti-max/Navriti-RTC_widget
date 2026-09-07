import { getApi } from "./api";

export const getMessages = async (conversationId,platformId) => {
  const api = getApi();

  const response = await api.get(
    `/messages/${conversationId}`,
    {
      params:{
        platformId,
      }

    }
  );

  return response.data;
};