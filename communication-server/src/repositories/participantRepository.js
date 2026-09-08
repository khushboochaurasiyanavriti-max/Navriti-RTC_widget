import cassandra from "../config/cassandra.js";


const requirePlatformId = (platformId) => {

    if (!platformId) {
        throw new Error(
            "platformId is required"
        );
    }
};


/*
 * ---------------------------------------------------------
 * Add Single Participant
 * ---------------------------------------------------------
 */

export const addParticipant = async ({
    userId,
    conversationId,
    platformId,
    joinedAt = new Date(),
}) => {

    requirePlatformId(platformId);


    await cassandra.batch(
        [
            {
                query: `
                    INSERT INTO participants_by_user (
                        platform_id,
                        user_id,
                        conversation_id,
                        joined_at
                    )
                    VALUES (?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    userId,
                    conversationId,
                    joinedAt,
                ],
            },

            {
                query: `
                    INSERT INTO participants_by_conversation (
                        platform_id,
                        conversation_id,
                        user_id,
                        joined_at
                    )
                    VALUES (?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    conversationId,
                    userId,
                    joinedAt,
                ],
            },
        ],

        {
            prepare: true,
        }
    );
};


/*
 * ---------------------------------------------------------
 * Add Multiple Participants
 * ---------------------------------------------------------
 */

export const addParticipants = async ({
    conversationId,
    userIds,
    platformId,
}) => {

    requirePlatformId(platformId);


    const queries = [];

    const joinedAt =
        new Date();


    for (
        const userId of userIds
    ) {

        queries.push(
            {
                query: `
                    INSERT INTO participants_by_user (
                        platform_id,
                        user_id,
                        conversation_id,
                        joined_at
                    )
                    VALUES (?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    userId,
                    conversationId,
                    joinedAt,
                ],
            }
        );


        queries.push(
            {
                query: `
                    INSERT INTO participants_by_conversation (
                        platform_id,
                        conversation_id,
                        user_id,
                        joined_at
                    )
                    VALUES (?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    conversationId,
                    userId,
                    joinedAt,
                ],
            }
        );
    }


    if (queries.length) {

        await cassandra.batch(
            queries,

            {
                prepare: true,
            }
        );
    }
};


/*
 * ---------------------------------------------------------
 * Get Conversations By User
 * ---------------------------------------------------------
 */

export const getByUserId = async (
    userId,
    platformId,
) => {

    requirePlatformId(
        platformId
    );


    const query = `
        SELECT
            user_id,
            conversation_id,
            joined_at
        FROM participants_by_user
        WHERE
            platform_id = ?
            AND user_id = ?
        ALLOW FILTERING
    `;


    const result =
        await cassandra.execute(
            query,

            [
                platformId,
                userId,
            ],

            {
                prepare: true,
            }
        );


    return result.rows;
};


/*
 * ---------------------------------------------------------
 * Get Participants By Conversation
 * ---------------------------------------------------------
 */

export const getByConversationId = async (
    conversationId,
    platformId,
) => {

    requirePlatformId(
        platformId
    );


    const query = `
        SELECT
            user_id,
            conversation_id,
            joined_at
        FROM participants_by_conversation
        WHERE
            platform_id = ?
            AND conversation_id = ?
        ALLOW FILTERING
    `;


    const result =
        await cassandra.execute(
            query,

            [
                platformId,
                conversationId,
            ],

            {
                prepare: true,
            }
        );


    return result.rows;
};