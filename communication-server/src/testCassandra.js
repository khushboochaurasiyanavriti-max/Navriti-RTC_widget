import {
    getOrCreateDirect,
} from "./repositories/conversationRepository.js";

const currentUserId = "cassandra-test-user-1";
const targetUserId = "cassandra-test-user-2";

const first = await getOrCreateDirect({
    currentUserId,
    targetUserId,
});

console.log("First request:", first);

const second = await getOrCreateDirect({
    currentUserId,
    targetUserId,
});

console.log("Second request:", second);

console.log(
    "Same conversation:",
    first.conversationId === second.conversationId
);

process.exit(0);