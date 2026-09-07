import { getApi } from "./api";

export const createOrGetDirect = async (
  currentUserId,
  targetUserId,
  platformId,
) => {
  const api = getApi();

  const response = await api.post("/conversations/direct", {
    currentUserId,
    targetUserId,
    platformId,
  });

  return response.data;
};

export const getUserConversations = async (userId,platformId) => {
  const api = getApi();

  const response = await api.get(
    `/conversations/user/${userId}`,
    {
      params:{
        platformId,
      },
    }
  );

  return response.data;
};

export const createGroup = async (
  groupName,
  currentUserId,
  participants,
  platformId,
) => {
  const api = getApi();

  const response = await api.post("/conversations/group", {
    groupName,
    currentUserId,
    participants,
    platformId,
  });

  return response.data;
};