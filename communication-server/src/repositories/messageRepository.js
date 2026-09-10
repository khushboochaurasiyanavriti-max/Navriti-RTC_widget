import cassandra from "../config/cassandra.js";
import crypto from "crypto";

import {
    findById,
} from "./conversationRepository.js";

import {
    encrypt,
    decrypt,
} from "../service/encryptionService.js";

const generateMessageId = () => {
return crypto
.randomBytes(12)
.toString("hex");
};

const requirePlatformId = (
platformId
) => {


if (!platformId) {
    throw new Error(
        "platformId is required"
    );
}


};

const serializeAttachment = (
attachment
) => {


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

const rowToMessage = (
row
) => {


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
        row.content
        ? decrypt(
            row.content,
            {
                platformId: row.platform_id,
                entity: "message",
                field: "content",
            }
        )
        : "",

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

    platformId:
        row.platform_id,
};


};

/* =====================================================
PLATFORM CONVERSATION VALIDATION
===================================================== */

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


return conversation || null;


};

/* =====================================================
CREATE MESSAGE
===================================================== */

export const createMessage = async ({
conversationId,
platformId,
senderId,
content = "",
messageType = "text",
attachment = null,
status = "sent",
}) => {


requirePlatformId(platformId);


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
const encryptedContent =
    encrypt(
        content,
        {
            platformId,
            entity: "message",
            field: "content",
        }
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
                encryptedContent,
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
                encryptedContent,
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

    platformId,

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

/* =====================================================
GET MESSAGES
===================================================== */

export const getMessages = async ({
conversationId,
platformId,
limit = 100,
before = null,
}) => {


requirePlatformId(platformId);


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
    WHERE platform_id = ?
    AND conversation_id = ?
`;


const params = [
    platformId,
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


return result.rows
    .map(
        rowToMessage
    )
    .reverse();


};

/* =====================================================
FIND MESSAGE BY ID
===================================================== */

export const findMessageById = async ({
messageId,
platformId,
}) => {


requirePlatformId(platformId);


if (!messageId) {
    return null;
}


const result =
    await cassandra.execute(
        `
            SELECT *
            FROM messages_by_id
            WHERE platform_id = ?
            AND message_id = ?
        `,

        [
            platformId,
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
 * Extra validation:
 * message conversation must also exist
 * under the same platform.
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

/* =====================================================
UPDATE MESSAGE CONTENT
===================================================== */

export const updateMessageContent = async ({
messageId,
platformId,
senderId,
content,
}) => {


requirePlatformId(platformId);


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

const encryptedContent = encrypt(
    content,
    {
        platformId,
        entity: "message",
        field: "content",
    }
);


await cassandra.batch(
    [
        {
            query: `
                UPDATE messages_by_id
                SET
                    content = ?,
                    updated_at = ?
                WHERE
                    platform_id = ?
                    AND message_id = ?
            `,

            params: [
                encryptedContent,
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
                WHERE
                    platform_id = ?
                    AND conversation_id = ?
                    AND created_at = ?
                    AND message_id = ?
            `,

            params: [
                encryptedContent,
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

/* =====================================================
SOFT DELETE MESSAGE
===================================================== */

export const softDeleteMessage = async ({
messageId,
platformId,
senderId,
}) => {


requirePlatformId(platformId);


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
                WHERE
                    platform_id = ?
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
                WHERE
                    platform_id = ?
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

/* =====================================================
GET LATEST MESSAGE
===================================================== */

export const getLatestMessage = async ({
conversationId,
platformId,
}) => {


requirePlatformId(platformId);


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
            WHERE platform_id = ?
            AND conversation_id = ?
            LIMIT 1
        `,

        [
            platformId,
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
