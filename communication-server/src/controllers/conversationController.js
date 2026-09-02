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




// direct chat between two users
export const createOrGetDirect = async (req, res) => {
    try {

        const {
            currentUserId,
            targetUserId,
        } = req.body;

        if (!currentUserId || !targetUserId) {
            return res.status(400).json({
                message: "Both user IDs are required",
            });
        }

        const {
            conversationId,
            created,
        } = await getOrCreateDirect({
            currentUserId,
            targetUserId,
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
            });
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

        // Get all conversations for this user from Cassandra
        const participantRows = await getByUserId(userId);

        const conversationIds = participantRows.map(
            (participant) => participant.conversation_id
        );

        if (!conversationIds.length) {
            return res.status(200).json([]);
        }

        // Get conversations from Cassandra
        const conversations = await findByIds(
            conversationIds
        );

        const response = [];

        for (const conversation of conversations) {

            let displayName =
                conversation.display_name;

            // Get ALL participants from Cassandra
            const conversationParticipants =
                await getByConversationId(
                    conversation.conversation_id
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
                await getLatestMessage(
                    conversation.conversation_id
                );

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
        } = req.body;

        // -----------------------------
        // Validate request
        // -----------------------------

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
            });

        // -----------------------------
        // Create participants in Cassandra
        // -----------------------------

        await addParticipants({
            conversationId:
                conversation.conversationId,
            userIds: allParticipants,
        });

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