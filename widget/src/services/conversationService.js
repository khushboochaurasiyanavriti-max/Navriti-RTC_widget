import { getApi } from "./api";

export const createOrGetDirect = async (
  currentUserId,
  targetUserId
) => {
  const api = getApi();

  const response = await api.post("/conversations/direct", {
    currentUserId,
    targetUserId,
  });

  return response.data;
};

export const getUserConversations = async (userId) => {
  const api = getApi();

  const response = await api.get(
    `/conversations/user/${userId}`
  );

  return response.data;
};

export const createGroup = async (
  groupName,
  currentUserId,
  participants
) => {
  const api = getApi();

  const response = await api.post("/conversations/group", {
    groupName,
    currentUserId,
    participants,
  });

  return response.data;
};