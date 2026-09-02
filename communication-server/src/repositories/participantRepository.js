import cassandra from "../config/cassandra.js";

export const addParticipant = async ({
    userId,
    conversationId,
    joinedAt = new Date(),
}) => {

    await cassandra.batch(
        [
            {
                query: `
                    INSERT INTO participants_by_user (
                        user_id,
                        conversation_id,
                        joined_at
                    )
                    VALUES (?, ?, ?)
                `,
                params: [
                    userId,
                    conversationId,
                    joinedAt,
                ],
            },
            {
                query: `
                    INSERT INTO participants_by_conversation (
                        conversation_id,
                        user_id,
                        joined_at
                    )
                    VALUES (?, ?, ?)
                `,
                params: [
                    conversationId,
                    userId,
                    joinedAt,
                ],
            },
        ],
        { prepare: true }
    );
};


export const addParticipants = async ({
    conversationId,
    userIds,
}) => {

    const queries = [];

    const joinedAt = new Date();

    for (const userId of userIds) {

        queries.push({
            query: `
                INSERT INTO participants_by_user (
                    user_id,
                    conversation_id,
                    joined_at
                )
                VALUES (?, ?, ?)
            `,
            params: [
                userId,
                conversationId,
                joinedAt,
            ],
        });

        queries.push({
            query: `
                INSERT INTO participants_by_conversation (
                    conversation_id,
                    user_id,
                    joined_at
                )
                VALUES (?, ?, ?)
            `,
            params: [
                conversationId,
                userId,
                joinedAt,
            ],
        });
    }

    if (queries.length) {
        await cassandra.batch(
            queries,
            { prepare: true }
        );
    }
};


export const getByUserId = async (userId) => {

    const query = `
        SELECT user_id, conversation_id, joined_at
        FROM participants_by_user
        WHERE user_id = ?
    `;

    const result = await cassandra.execute(
        query,
        [userId],
        { prepare: true }
    );

    return result.rows;
};


export const getByConversationId = async (
    conversationId
) => {

    const query = `
        SELECT user_id, conversation_id, joined_at
        FROM participants_by_conversation
        WHERE conversation_id = ?
    `;

    const result = await cassandra.execute(
        query,
        [conversationId],
        { prepare: true }
    );

    return result.rows;
};