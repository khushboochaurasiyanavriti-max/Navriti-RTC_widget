import { getApi } from "./api";

export const getMessages = async (conversationId) => {
  const api = getApi();

  const response = await api.get(
    `/messages/${conversationId}`
  );

  return response.data;
};