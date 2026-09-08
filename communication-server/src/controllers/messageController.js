import { getMessages as getCassandraMessages } from "../repositories/messageRepository.js";
import { assertConversationPlatform } from "../repositories/conversationRepository.js";

const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 100, before, platformId } = req.query;
        if (!platformId) return res.status(400).json({ message: "platformId is required" });
        await assertConversationPlatform(conversationId, platformId);

        if (before) {
            const beforeDate = new Date(before);

            if (isNaN(beforeDate.getTime())) {
                return res.status(400).json({
                    message: "Invalid before timestamp",
                });
            }

            const messages = await getCassandraMessages({
                conversationId,
                platformId,
                limit: Number(limit),
                before: beforeDate,
            });

            return res.status(200).json(messages || []);
        }

        const messages = await getCassandraMessages({
            conversationId,
            platformId,
            limit: Number(limit),
        });

        return res.status(200).json(messages || []);

    } catch (error) {
        console.error(
            "GET MESSAGES ERROR:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch messages",
            error: error.message,
        });
    }
};

export default getMessages;