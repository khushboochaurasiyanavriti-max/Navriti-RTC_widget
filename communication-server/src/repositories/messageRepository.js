
import cassandra from "../config/cassandra.js";
import crypto from "crypto";

import {
    findById,
} from "./conversationRepository.js";

const generateMessageId = () => {
    return crypto
        .randomBytes(12)
        .toString("hex");
};


const serializeAttachment = (attachment) => {
    if (!attachment) {
        return null;
    }

    return JSON.stringify(
        attachment
    );
};


const deserializeAttachment = (
    attachment
) => {
    if (!attachment) {
        return null;
    }

    try {
        return JSON.parse(
            attachment
        );
    } catch {
        return null;
    }
};


const rowToMessage = (row) => {
    if (!row) {
        return null;
    }

    return {
        _id:
            row.message_id,

        conversationId:
            row.conversation_id,

        senderId:
            row.sender_id,

        content:
            row.content || "",

        messageType:
            row.message_type ||
            "text",

        attachment:
            deserializeAttachment(
                row.attachment
            ),

        status:
            row.status ||
            "sent",

        isDeleted:
            row.is_deleted ||
            false,

        createdAt:
            row.created_at,

        updatedAt:
            row.updated_at,
    };
};


/*
 * ---------------------------------------------------------
 * Verify that the conversation belongs to the platform.
 *
 * This is the central isolation check used by every message
 * operation.
 * ---------------------------------------------------------
 */

const getPlatformConversation = async ({
    conversationId,
    platformId,
}) => {

    if (
        !conversationId ||
        !platformId
    ) {
        return null;
    }


    const conversation =
        await findById(
            conversationId,
            platformId,
        );


    if (!conversation) {
        return null;
    }


    return conversation;
};


/*
 * ---------------------------------------------------------
 * Create Message
 * ---------------------------------------------------------
 */

export const createMessage = async ({
    conversationId,
    platformId,
    senderId,
    content = "",
    messageType = "text",
    attachment = null,
    status = "sent",
}) => {

    /*
     * Platform isolation validation.
     */

    const conversation =
        await getPlatformConversation({
            conversationId,
            platformId,
        });


    if (!conversation) {
        return null;
    }


    const messageId =
        generateMessageId();

    const now =
        new Date();


    const attachmentJson =
        serializeAttachment(
            attachment
        );


    await cassandra.batch(
        [
            {
                query: `
                    INSERT INTO messages_by_conversation (
                        platform_id,
                        conversation_id,
                        created_at,
                        message_id,
                        sender_id,
                        content,
                        message_type,
                        attachment,
                        status,
                        is_deleted,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    conversationId,
                    now,
                    messageId,
                    senderId,
                    content,
                    messageType,
                    attachmentJson,
                    status,
                    false,
                    now,
                ],
            },

            {
                query: `
                    INSERT INTO messages_by_id (
                        platform_id,
                        message_id,
                        conversation_id,
                        created_at,
                        sender_id,
                        content,
                        message_type,
                        attachment,
                        status,
                        is_deleted,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    messageId,
                    conversationId,
                    now,
                    senderId,
                    content,
                    messageType,
                    attachmentJson,
                    status,
                    false,
                    now,
                ],
            },
        ],

        {
            prepare: true,
        }
    );


    return {
        _id:
            messageId,

        conversationId,

        senderId,

        content,

        messageType,

        attachment,

        status,

        isDeleted:
            false,

        createdAt:
            now,

        updatedAt:
            now,
    };
};


/*
 * ---------------------------------------------------------
 * Get Messages
 * ---------------------------------------------------------
 */

export const getMessages = async ({
    conversationId,
    platformId,
    limit = 100,
    before = null,
}) => {

    /*
     * Verify conversation ownership before reading messages.
     */

    const conversation =
        await getPlatformConversation({
            conversationId,
            platformId,
        });


    if (!conversation) {
        return null;
    }


    let query = `
        SELECT *
        FROM messages_by_conversation
        WHERE conversation_id = ?
    `;


    const params = [
        conversationId,
    ];


    if (before) {

        query += `
            AND created_at < ?
        `;


        params.push(
            before
        );
    }


    query += `
        LIMIT ?
        ALLOW FILTERING
    `;


    params.push(
        Number(limit)
    );


    const result =
        await cassandra.execute(
            query,
            params,
            {
                prepare: true,
            }
        );


    /*
     * Cassandra returns newest → oldest.
     * Frontend expects oldest → newest.
     */

    return result.rows
        .map(
            rowToMessage
        )
        .reverse();
};


/*
 * ---------------------------------------------------------
 * Find Message By ID
 *
 * This is platform protected.
 *
 * A message ID alone is not sufficient to retrieve data.
 * ---------------------------------------------------------
 */

export const findMessageById = async ({
    messageId,
    platformId,
}) => {

    if (
        !messageId ||
        !platformId
    ) {
        return null;
    }


    const result =
        await cassandra.execute(
            `
                SELECT *
                FROM messages_by_id
                WHERE message_id = ?
                ALLOW FILTERING
            `,
            [
                messageId,
            ],
            {
                prepare: true,
            }
        );


    const message =
        rowToMessage(
            result.rows[0]
        );


    if (!message) {
        return null;
    }


    /*
     * Verify that the message's conversation
     * belongs to the requested platform.
     */

    const conversation =
        await getPlatformConversation({
            conversationId:
                message.conversationId,

            platformId,
        });


    if (!conversation) {
        return null;
    }


    return message;
};


/*
 * ---------------------------------------------------------
 * Update Message Content
 * ---------------------------------------------------------
 */

export const updateMessageContent = async ({
    messageId,
    platformId,
    senderId,
    content,
}) => {

    /*
     * findMessageById already validates platform ownership.
     */

    const message =
        await findMessageById({
            messageId,
            platformId,
        });


    if (!message) {
        return null;
    }


    if (
        message.senderId !==
        senderId
    ) {
        return null;
    }


    const updatedAt =
        new Date();


    await cassandra.batch(
        [
            {
                query: `
                    UPDATE messages_by_id
                    SET
                        content = ?,
                        updated_at = ?
                    WHERE platform_id = ?
                        AND message_id = ?
                `,

                params: [
                    content,
                    updatedAt,
                    platformId,
                    messageId,
                ],
            },

            {
                query: `
                    UPDATE messages_by_conversation
                    SET
                        content = ?,
                        updated_at = ?
                    WHERE platform_id = ?
                        AND conversation_id = ?
                        AND created_at = ?
                        AND message_id = ?
                `,

                params: [
                    content,
                    updatedAt,
                    platformId,
                    message.conversationId,
                    message.createdAt,
                    messageId,
                ],
            },
        ],

        {
            prepare: true,
        }
    );


    return {
        ...message,

        content,

        updatedAt,
    };
};


/*
 * ---------------------------------------------------------
 * Soft Delete Message
 * ---------------------------------------------------------
 */

export const softDeleteMessage = async ({
    messageId,
    platformId,
    senderId,
}) => {

    /*
     * findMessageById validates
     * message → conversation → platform ownership.
     */

    const message =
        await findMessageById({
            messageId,
            platformId,
        });


    if (!message) {
        return null;
    }


    if (
        message.senderId !==
        senderId
    ) {
        return null;
    }


    const updatedAt =
        new Date();


    await cassandra.batch(
        [
            {
                query: `
                    UPDATE messages_by_id
                    SET
                        is_deleted = true,
                        updated_at = ?
                    WHERE platform_id = ?
                        AND message_id = ?
                `,

                params: [
                    updatedAt,
                    platformId,
                    messageId,
                ],
            },

            {
                query: `
                    UPDATE messages_by_conversation
                    SET
                        is_deleted = true,
                        updated_at = ?
                    WHERE platform_id = ?
                        AND conversation_id = ?
                        AND created_at = ?
                        AND message_id = ?
                `,

                params: [
                    updatedAt,
                    platformId,
                    message.conversationId,
                    message.createdAt,
                    messageId,
                ],
            },
        ],

        {
            prepare: true,
        }
    );


    return {
        ...message,

        isDeleted:
            true,

        updatedAt,
    };
};


/*
 * ---------------------------------------------------------
 * Get Latest Message
 * ---------------------------------------------------------
 */

export const getLatestMessage = async ({
    conversationId,
    platformId,
}) => {

    /*
     * Verify conversation belongs to platform.
     */

    const conversation =
        await getPlatformConversation({
            conversationId,
            platformId,
        });


    if (!conversation) {
        return null;
    }


    const result =
        await cassandra.execute(
            `
                SELECT *
                FROM messages_by_conversation
                WHERE conversation_id = ?
                LIMIT 1
                ALLOW FILTERING
            `,

            [
                conversationId,
            ],

            {
                prepare: true,
            }
        );


    return rowToMessage(
        result.rows[0]
    );
};

