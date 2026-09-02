import "dotenv/config";

import mongoose from "mongoose";
import cassandra from "./config/cassandra.js";

import Conversation from "./models/Conversation.js";
import Participant from "./models/Participant.js";
import Message from "./models/Message.js";


const serializeAttachment = (attachment) => {
    if (!attachment) {
        return null;
    }

    return JSON.stringify(attachment);
};


const migrateConversations = async () => {

    const conversations =
        await Conversation.find({}).lean();

    console.log(
        `Found ${conversations.length} conversations`
    );

    for (const conversation of conversations) {

        const conversationId =
            conversation._id.toString();

        const createdAt =
            conversation.createdAt || new Date();

        const updatedAt =
            conversation.updatedAt || createdAt;

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
                conversation.type || "direct",
                conversation.displayName || null,
                conversation.participantKey || null,
                createdAt,
                updatedAt,
            ],
            { prepare: true }
        );

        /*
         * participantKey exists only for direct
         * conversations in the current Mongo model.
         */
        if (conversation.participantKey) {

            await cassandra.execute(
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
                `,
                [
                    conversation.participantKey,
                    conversationId,
                    conversation.type || "direct",
                    conversation.displayName || null,
                    createdAt,
                    updatedAt,
                ],
                { prepare: true }
            );
        }
    }

    console.log("Conversations migrated");
};


const migrateParticipants = async () => {

    const participants =
        await Participant.find({}).lean();

    console.log(
        `Found ${participants.length} participants`
    );

    for (const participant of participants) {

        const userId =
            participant.userId;

        const conversationId =
            participant.conversationId.toString();

        const joinedAt =
            participant.joinedAt || new Date();

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
    }

    console.log("Participants migrated");
};


const migrateMessages = async () => {

    const messages =
        await Message.find({}).lean();

    console.log(
        `Found ${messages.length} messages`
    );

    for (const message of messages) {

        const messageId =
            message._id.toString();

        const conversationId =
            message.conversationId.toString();

        const createdAt =
            message.createdAt || new Date();

        const updatedAt =
            message.updatedAt || createdAt;

        const attachment =
            serializeAttachment(
                message.attachment
            );

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
                        createdAt,
                        messageId,
                        message.senderId,
                        message.content || "",
                        message.messageType || "text",
                        attachment,
                        message.status || "sent",
                        message.isDeleted || false,
                        updatedAt,
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
                        createdAt,
                        message.senderId,
                        message.content || "",
                        message.messageType || "text",
                        attachment,
                        message.status || "sent",
                        message.isDeleted || false,
                        updatedAt,
                    ],
                },
            ],
            { prepare: true }
        );
    }

    console.log("Messages migrated");
};


const main = async () => {

    try {

        console.log(
            "Starting MongoDB → Cassandra migration..."
        );

        await mongoose.connect(
            process.env.MONGODB_URI
        );

        console.log("MongoDB connected");

        await cassandra.connect();

        console.log("Cassandra connected");

        await migrateConversations();

        await migrateParticipants();

        await migrateMessages();

        console.log(
            "MongoDB → Cassandra migration completed successfully"
        );

    } catch (error) {

        console.error(
            "Migration failed:",
            error
        );

        process.exitCode = 1;

    } finally {

        await mongoose.disconnect();

        await cassandra.shutdown();
    }
};


await main();