import {
    createMessage,
    getMessages,
    updateMessageContent,
    softDeleteMessage,
} from "./repositories/messageRepository.js";

const conversationId =
    "f0dd8551e4e0e28947cd74a7";

const senderId = "user-1";

const created = await createMessage({
    conversationId,
    senderId,
    content: "Hello Cassandra",
    messageType: "text",
});

console.log("Created:", created);

const messages = await getMessages({
    conversationId,
    limit: 100,
});

console.log("Messages:", messages);

const edited = await updateMessageContent({
    messageId: created._id,
    senderId,
    content: "Hello Cassandra - edited",
});

console.log("Edited:", edited);

const deleted = await softDeleteMessage({
    messageId: created._id,
    senderId,
});

console.log("Deleted:", deleted);

process.exit(0);