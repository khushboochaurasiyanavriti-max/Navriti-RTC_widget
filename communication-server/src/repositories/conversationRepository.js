import cassandra from "../config/cassandra.js";
import crypto from "crypto";

const generateConversationId = () => {
    return crypto.randomBytes(12).toString("hex");
};
const requirePlatformId = (platformId) => {
    if (!platformId) throw new Error("platformId is required");
};


export const findByParticipantKey = async (participantKey) => {
    const query = `
        SELECT *
        FROM conversations_by_participant_key
        WHERE participant_key = ?
        ALLOW FILTERING
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
    platformId,
}) => {
    
    requirePlatformId(platformId);

    const conversationId = generateConversationId();
    const now = new Date();

    const queries = [
        {
            query: `
                INSERT INTO conversations_by_id (
                    conversation_id,
                    platform_id,
                    type,
                    display_name,
                    participant_key,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            params: [
                conversationId,
                platformId,
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
                    platform_id,
                    type,
                    display_name,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            params: [
                participantKey,
                conversationId,
                platformId,
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
        platformId,
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
    platformId,
}) => {
    requirePlatformId(platformId);

    const userKey =
        [
            currentUserId,
            targetUserId,
        ]
            .sort()
            .join(":");


    const participantKey =
        `${platformId}:${userKey}`;
        

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
                platform_id,
                type,
                display_name,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            IF NOT EXISTS
        `,
        [
            participantKey,
            conversationId,
            platformId,
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
                platform_id,
                type,
                display_name,
                participant_key,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            conversationId,
            platformId,
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


export const findById = async (conversationId,platformId) => {
    const query = `
        SELECT *
        FROM conversations_by_id
        WHERE conversation_id = ?
        ALLOW FILTERING
    `;

    const result = await cassandra.execute(
        query,
        [conversationId],
        { prepare: true }
    );

    const row = result.rows[0] || null;
    if (!row) 
        return null;
    if (platformId && row.platform_id !== platformId) 
        return null;
    return row;
};

export const assertConversationPlatform = async (conversationId, platformId) => {
    requirePlatformId(platformId);
    const conversation = 
        await findById(
            conversationId, 
            platformId,
        );
    if (!conversation) {
        const error = new Error("Conversation does not belong to this platform");
        error.statusCode = 404;
        throw error;
    }
    return conversation;
};


export const findByIds = async (conversationIds,platformId) => {

    if (!conversationIds.length) {
        return [];
    }

    const results = await Promise.all(
        conversationIds.map((conversationId) =>
            findById(conversationId,platformId)
        )
    );

    return results.filter(Boolean);
};


export const createGroup = async ({
    displayName,
    platformId,
}) => {
    requirePlatformId(platformId);

    const conversationId = generateConversationId();
    const now = new Date();

    await cassandra.execute(
        `
        INSERT INTO conversations_by_id (
            conversation_id,
            platform_id,
            type,
            display_name,
            participant_key,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            conversationId,
            platformId,
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
        platformId,
        type: "group",
        displayName,
        participantKey: null,
        createdAt: now,
        updatedAt: now,
    };
};