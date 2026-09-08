import {
    getOrCreateDirect,
    findById,
    findByIds,
    createGroup as createGroupCassandra,
} from "../repositories/conversationRepository.js";
import {
    addParticipants,
    getByUserId,
    getByConversationId,
} from "../repositories/participantRepository.js";

import {
    getLatestMessage,
} from "../repositories/messageRepository.js";
import { notifyConversationParticipants } from "../socket/socketHandler.js";

let io = null;
export const setConversationSocket = (socketIo) => {
    io = socketIo;
};

const platformError = (res) => res.status(400).json({ message: "platformId is required" });




// direct chat between two users
export const createOrGetDirect = async (req, res) => {
    try {

        const {
            currentUserId,
            targetUserId,
            platformId,
        } = req.body;
        if(!platformId) 
            return platformError(res);

        if (!currentUserId || !targetUserId || !platformId) {
            return res.status(400).json({
                message: "Current user ID, target user ID and platform ID are required",
            });
        }

        const {
            conversationId,
            created,
        } = await getOrCreateDirect({
            currentUserId,
            targetUserId,
            platformId,
        });

        // Only add participants when the conversation
        // was actually created.
        if (created) {
            await addParticipants({
                conversationId,
                userIds: [
                    currentUserId,
                    targetUserId,
                ],
                platformId,
            });
        }

        if (io) {
            await notifyConversationParticipants(
                io,
                conversationId,
                null,
                platformId
            );
        }

        return res.status(
            created ? 201 : 200
        ).json({
            conversationId,
        });

    } catch (error) {

        console.error(
            "CREATE/GET DIRECT ERROR:",
            error
        );

        return res.status(500).json({
            message: error.message,
        });
    }
};


export const getUserConversations = async (req, res) => {
    try {
        const { userId } = req.params;
        const { platformId } = req.query;

        if(!platformId) 
            return platformError(res);

        // Get only conversations for this user on this platform.
        const participantRows = await getByUserId(userId, platformId);

        const conversationIds = participantRows.map(
            (participant) => participant.conversation_id
        );

        if (!conversationIds.length) {
            return res.status(200).json([]);
        }

        // Get conversations from Cassandra
        const conversations = await findByIds(
            conversationIds,
            platformId
        );

        const response = [];

        for (const conversation of conversations) {

            let displayName =
                conversation.display_name;

            // Get ALL participants from Cassandra
            const conversationParticipants =
                await getByConversationId(
                    conversation.conversation_id,
                    platformId,
                );

            const participantIds =
                conversationParticipants.map(
                    (participant) =>
                        participant.user_id
                );

            // Direct chat:
            // show the other participant
            if (
                conversation.type === "direct"
            ) {
                const otherParticipant =
                    conversationParticipants.find(
                        (participant) =>
                            participant.user_id !== userId
                    );

                displayName =
                    otherParticipant
                        ? otherParticipant.user_id
                        : "Unknown";
            }

            const lastMessage =
                await getLatestMessage({
                    conversationId: conversation.conversation_id,
                    platformId,
                });

            response.push({
                conversationId:
                    conversation.conversation_id,

                type:
                    conversation.type,

                displayName,

                participants:
                    participantIds,

                lastMessage:
                    !lastMessage
                        ? ""
                        : lastMessage.isDeleted
                            ? "Message deleted"
                            : lastMessage.messageType === "file"
                                ? `📎 ${
                                    lastMessage.attachment?.originalName ||
                                    lastMessage.attachment?.fileName ||
                                    "File"
                                }`
                                : lastMessage.content || "",

                lastMessageTime:
                    lastMessage
                        ? lastMessage.createdAt
                        : null,
            });
        }

        // Sort by latest message
        response.sort((a, b) => {

            const timeA = a.lastMessageTime
                ? new Date(
                    a.lastMessageTime
                ).getTime()
                : 0;

            const timeB = b.lastMessageTime
                ? new Date(
                    b.lastMessageTime
                ).getTime()
                : 0;

            return timeB - timeA;
        });

        return res.status(200).json(response);

    } catch (error) {

        console.error(
            "GET USER CONVERSATIONS ERROR:",
            error
        );

        return res.status(500).json({
            message: error.message,
        });
    }
};

export const createGroup = async (req, res) => {
    try {
        const {
            groupName,
            currentUserId,
            participants,
            platformId,
        } = req.body;

        // -----------------------------
        // Validate request
        // -----------------------------
        if(!platformId) 
            return platformError(res);
        if (
            !groupName?.trim() ||
            !currentUserId ||
            !Array.isArray(participants) ||
            participants.length === 0
        ) {
            return res.status(400).json({
                message: "Invalid request",
            });
        }

        // -----------------------------
        // Remove duplicate users
        // -----------------------------

        const allParticipants = [
            ...new Set([
                currentUserId,
                ...participants,
            ]),
        ];

        // -----------------------------
        // Create group in Cassandra
        // -----------------------------

        const conversation =
            await createGroupCassandra({
                displayName: groupName.trim(),
                platformId,
            });

        // -----------------------------
        // Create participants in Cassandra
        // -----------------------------

        await addParticipants({
            conversationId:
                conversation.conversationId,
            userIds: allParticipants,
            platformId,
        });

        if (io) {
            await notifyConversationParticipants(
                io,
                conversation.conversationId,
                null,
                platformId
            );
        }

        // -----------------------------
        // Response
        // -----------------------------

        return res.status(201).json({
            conversationId:
                conversation.conversationId,

            displayName:
                conversation.displayName,

            participants:
                allParticipants,
        });

    } catch (error) {

        console.error(
            "CREATE GROUP ERROR:",
            error
        );

        return res.status(500).json({
            message: "Failed to create group",
            error: error.message,
        });
    }
};