import cassandra from "../config/cassandra.js";
import crypto from "crypto";

const generateMessageId = () => {
    return crypto.randomBytes(12).toString("hex");
};

const serializeAttachment = (attachment) => {
    if (!attachment) {
        return null;
    }

    return JSON.stringify(attachment);
};

const deserializeAttachment = (attachment) => {
    if (!attachment) {
        return null;
    }

    try {
        return JSON.parse(attachment);
    } catch {
        return null;
    }
};

const rowToMessage = (row) => {
    if (!row) {
        return null;
    }

    return {
        _id: row.message_id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        content: row.content || "",
        messageType: row.message_type || "text",
        attachment: deserializeAttachment(row.attachment),
        status: row.status || "sent",
        isDeleted: row.is_deleted || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};


export const createMessage = async ({
    conversationId,
    senderId,
    content = "",
    messageType = "text",
    attachment = null,
    status = "sent",
}) => {

    const messageId = generateMessageId();
    const now = new Date();

    const attachmentJson =
        serializeAttachment(attachment);

    await cassandra.batch(
        [
            {
                query: `
                    INSERT INTO messages_by_conversation (
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
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                params: [
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
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                params: [
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
        { prepare: true }
    );

    return {
        _id: messageId,
        conversationId,
        senderId,
        content,
        messageType,
        attachment,
        status,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
    };
};


export const getMessages = async ({
    conversationId,
    limit = 100,
    before = null,
}) => {

    let query = `
        SELECT *
        FROM messages_by_conversation
        WHERE conversation_id = ?
    `;

    const params = [conversationId];

    if (before) {
        query += `
            AND created_at < ?
        `;

        params.push(before);
    }

    query += `
        LIMIT ?
    `;

    params.push(Number(limit));

    const result = await cassandra.execute(
        query,
        params,
        { prepare: true }
    );

    // Cassandra returns newest → oldest because
    // created_at is DESC.
    // Frontend expects oldest → newest.
    return result.rows
        .map(rowToMessage)
        .reverse();
};


export const findMessageById = async (
    messageId
) => {

    const result = await cassandra.execute(
        `
            SELECT *
            FROM messages_by_id
            WHERE message_id = ?
        `,
        [messageId],
        { prepare: true }
    );

    return rowToMessage(result.rows[0]);
};


export const updateMessageContent = async ({
    messageId,
    senderId,
    content,
}) => {

    const message =
        await findMessageById(messageId);

    if (!message) {
        return null;
    }

    if (message.senderId !== senderId) {
        return null;
    }

    const updatedAt = new Date();

    await cassandra.batch(
        [
            {
                query: `
                    UPDATE messages_by_id
                    SET content = ?,
                        updated_at = ?
                    WHERE message_id = ?
                `,
                params: [
                    content,
                    updatedAt,
                    messageId,
                ],
            },
            {
                query: `
                    UPDATE messages_by_conversation
                    SET content = ?,
                        updated_at = ?
                    WHERE conversation_id = ?
                      AND created_at = ?
                      AND message_id = ?
                `,
                params: [
                    content,
                    updatedAt,
                    message.conversationId,
                    message.createdAt,
                    messageId,
                ],
            },
        ],
        { prepare: true }
    );

    return {
        ...message,
        content,
        updatedAt,
    };
};


export const softDeleteMessage = async ({
    messageId,
    senderId,
}) => {

    const message =
        await findMessageById(messageId);

    if (!message) {
        return null;
    }

    if (message.senderId !== senderId) {
        return null;
    }

    const updatedAt = new Date();

    await cassandra.batch(
        [
            {
                query: `
                    UPDATE messages_by_id
                    SET is_deleted = true,
                        updated_at = ?
                    WHERE message_id = ?
                `,
                params: [
                    updatedAt,
                    messageId,
                ],
            },
            {
                query: `
                    UPDATE messages_by_conversation
                    SET is_deleted = true,
                        updated_at = ?
                    WHERE conversation_id = ?
                      AND created_at = ?
                      AND message_id = ?
                `,
                params: [
                    updatedAt,
                    message.conversationId,
                    message.createdAt,
                    messageId,
                ],
            },
        ],
        { prepare: true }
    );

    return {
        ...message,
        isDeleted: true,
        updatedAt,
    };
};

export const getLatestMessage = async (conversationId) => {
    const result = await cassandra.execute(
        `
            SELECT *
            FROM messages_by_conversation
            WHERE conversation_id = ?
            LIMIT 1
        `,
        [conversationId],
        { prepare: true }
    );

    return rowToMessage(result.rows[0]);
};