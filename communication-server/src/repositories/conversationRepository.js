import cassandra from "../config/cassandra.js";
import crypto from "crypto";

const generateConversationId = () => {
    return crypto.randomBytes(12).toString("hex");
};

export const findByParticipantKey = async (participantKey) => {
    const query = `
        SELECT *
        FROM conversations_by_participant_key
        WHERE participant_key = ?
    `;

    const result = await cassandra.execute(
        query,
        [participantKey],
        { prepare: true }
    );

    return result.rows[0] || null;
};


export const createConversation = async ({
    type = "direct",
    displayName = null,
    participantKey = null,
}) => {

    const conversationId = generateConversationId();
    const now = new Date();

    const queries = [
        {
            query: `
                INSERT INTO conversations_by_id (
                    conversation_id,
                    type,
                    display_name,
                    participant_key,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            params: [
                conversationId,
                type,
                displayName,
                participantKey,
                now,
                now,
            ],
        },
    ];

    if (participantKey) {
        queries.push({
            query: `
                INSERT INTO conversations_by_participant_key (
                    participant_key,
                    conversation_id,
                    type,
                    display_name,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            params: [
                participantKey,
                conversationId,
                type,
                displayName,
                now,
                now,
            ],
        });
    }

    await cassandra.batch(queries, {
        prepare: true,
    });

    return {
        conversationId,
        type,
        displayName,
        participantKey,
        createdAt: now,
        updatedAt: now,
    };
};


/*
 * Direct conversation:
 * Find existing conversation or create it safely.
 */
export const getOrCreateDirect = async ({
    currentUserId,
    targetUserId,
}) => {

    const participantKey = [
        currentUserId,
        targetUserId,
    ]
        .sort()
        .join(":");

    // 1. Check whether it already exists
    const existing = await findByParticipantKey(
        participantKey
    );

    if (existing) {
        return {
            conversationId: existing.conversation_id,
            created: false,
        };
    }

    // 2. Generate the conversation ID
    const conversationId = generateConversationId();
    const now = new Date();

    // 3. Try to claim this participantKey.
    // Only ONE concurrent request will get applied=true.
    const result = await cassandra.execute(
        `
            INSERT INTO conversations_by_participant_key (
                participant_key,
                conversation_id,
                type,
                display_name,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            IF NOT EXISTS
        `,
        [
            participantKey,
            conversationId,
            "direct",
            null,
            now,
            now,
        ],
        { prepare: true }
    );

    // 4. Another request created it first
    if (!result.rows[0]["[applied]"]) {
        const conversation = result.rows[0];

        return {
            conversationId: conversation.conversation_id,
            created: false,
        };
    }

    // 5. We successfully created the direct conversation
    await cassandra.execute(
        `
            INSERT INTO conversations_by_id (
                conversation_id,
                type,
                display_name,
                participant_key,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            conversationId,
            "direct",
            null,
            participantKey,
            now,
            now,
        ],
        { prepare: true }
    );

    return {
        conversationId,
        created: true,
    };
};


export const findById = async (conversationId) => {
    const query = `
        SELECT *
        FROM conversations_by_id
        WHERE conversation_id = ?
    `;

    const result = await cassandra.execute(
        query,
        [conversationId],
        { prepare: true }
    );

    return result.rows[0] || null;
};


export const findByIds = async (conversationIds) => {

    if (!conversationIds.length) {
        return [];
    }

    const results = await Promise.all(
        conversationIds.map((conversationId) =>
            findById(conversationId)
        )
    );

    return results.filter(Boolean);
};


export const createGroup = async ({
    displayName,
}) => {
    const conversationId = generateConversationId();
    const now = new Date();

    await cassandra.execute(
        `
        INSERT INTO conversations_by_id (
            conversation_id,
            type,
            display_name,
            participant_key,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            conversationId,
            "group",
            displayName,
            null,
            now,
            now,
        ],
        { prepare: true }
    );

    return {
        conversationId,
        type: "group",
        displayName,
        participantKey: null,
        createdAt: now,
        updatedAt: now,
    };
};