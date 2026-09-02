import { io } from "socket.io-client";
import { getServerUrl } from "./config";

let socket = null;

export function initializeSocket(
    userId
) {
    if (!socket) {
        const serverUrl = getServerUrl();

        if (!serverUrl) {
            throw new Error(
                "Server URL is not initialized."
            );
        }

        socket = io(serverUrl, {
            transports: ["polling", "websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 20000,


            //  // 1. Start directly with WebSockets, skipping the polling handshake
            // transports: ["websocket"], 
            
            // // 2. Prevent the client from trying to fall back to polling if connection drops
            // upgrade: false,            

            // reconnection: true,
            // reconnectionAttempts: Infinity,
            
            // // 3. Prevent thumping the server instantly; give browsers room to recover
            // reconnectionDelay: 1000,   
            // reconnectionDelayMax: 5000, 
            
            // // 4. Force a connection timeout early if a browser engine stalls
            // timeout: 20000, 
        });

        socket.on("connect", () => {
            console.log(
                "Socket connected:",
                socket.id
            );

            if (userId) {
                socket.emit(
                    "joinUser",
                    userId
                );
            }
        });

        socket.on("disconnect", (reason) => {
            console.log(
                "Socket disconnected:",
                reason
            );
        });

        socket.on("connect_error", (error) => {
            console.error(
                "Socket connection error:",
                error.message
            );
        });
    }

    return socket;
}

export function getSocket() {
    if (!socket) {
        throw new Error(
            "Socket is not initialized. Call initializeSocket() first."
        );
    }

    return socket;
}



/* 
 * ---------------------------------------------------------
 * Join Announcement RTC room
 * ---------------------------------------------------------
 */

export function joinAnnouncementRTC(
    portalId,
    userId
) {
    const socket = getSocket();

    if (!portalId || !userId) {
        return;
    }

    socket.emit(
        "joinAnnouncementRTC",
        {
            portalId,
            userId,
        }
    );
}


/*
 * ---------------------------------------------------------
 * Leave Announcement RTC room
 * ---------------------------------------------------------
 */

export function leaveAnnouncementRTC(
    portalId,
    userId
) {
    const socket = getSocket();

    if (!portalId || !userId) {
        return;
    }

    socket.emit(
        "leaveAnnouncementRTC",
        {
            portalId,
            userId,
        }
    );
}


export function sendAnnouncementOffer(
    portalId,
    userId,
    offer
) {
    const socket = getSocket();

    socket.emit(
        "announcement:offer",
        {
            portalId,
            userId,
            offer,
        }
    );
}


export function sendAnnouncementAnswer(
    portalId,
    userId,
    answer
) {
    const socket = getSocket();

    socket.emit(
        "announcement:answer",
        {
            portalId,
            userId,
            answer,
        }
    );
}


export function sendAnnouncementIceCandidate(
    portalId,
    userId,
    candidate
) {
    const socket = getSocket();

    socket.emit(
        "announcement:ice-candidate",
        {
            portalId,
            userId,
            candidate,
        }
    );
}



export function sendScreenShareOffer(
    conversationId,
    userId,
    targetUserId,
    offer
) {
    getSocket().emit(
        "screenShare:offer",
        {
            conversationId,
            userId,
            targetUserId,
            offer,
        }
    );
}


export function sendScreenShareAnswer(
    conversationId,
    userId,
    targetUserId,
    answer
) {
    getSocket().emit(
        "screenShare:answer",
        {
            conversationId,
            userId,
            targetUserId,
            answer,
        }
    );
}


export function sendScreenShareIceCandidate(
    conversationId,
    userId,
    targetUserId,
    candidate
) {
    getSocket().emit(
        "screenShare:ice-candidate",
        {
            conversationId,
            userId,
            targetUserId,
            candidate,
        }
    );
}

export function notifyScreenShareStarted(conversationId, userId) {
    getSocket().emit("screenShare:started", {
        conversationId,
        userId,
    });
}

export function notifyScreenShareStopped(conversationId, userId) {
    getSocket().emit("screenShare:stopped", {
        conversationId,
        userId,
    });
}
