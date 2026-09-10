import { getApi } from "./api";

export const getMessages = async (
  conversationId,
  platformId
) => {
  const api = getApi();

  const response = await api.get(
    `/messages/${conversationId}`,
    {
      params: {
        platformId,
      },
    }
  );

  return response.data;
};

export const downloadFile = async ({
  publicId,
  platformId,
  fileType,
  fileName,
  resourceType="raw",
}) => {
  const api = getApi();

  const response = await api.get(
    "/files/download",
    {
      params: {
        publicId,
        platformId,
        fileType,
        fileName,
        resourceType,
      },
      responseType: "blob",
    }
  );

  return response.data;
};

export const sendMessage = async ({
  conversationId,
  senderId,
  content,
  messageType = "text",
  attachment = null,
  platformId,
}) => {
  const api = getApi();

  const response = await api.post(
    "/messages",
    {
      conversationId,
      senderId,
      content,
      messageType,
      attachment,
      platformId,
    }
  );

  return response.data;
};