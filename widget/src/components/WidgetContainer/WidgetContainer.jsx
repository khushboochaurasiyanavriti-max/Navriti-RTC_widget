import { useEffect, useState, useRef, useCallback } from "react";

import {
    initializeSocket,
    getSocket,
} from "../../services/socket";

import ChatWindow from "../ChatWindow/ChatWindow";
import ConversationList from "../ConversationList/ConversationList";
import NewChatModal from "../NewChatModal/NewChatModal";
import NewGroupModal from "../NewGroupModal/NewGroupModal";

import { getMessages } from "../../services/messageService";
import AnnouncementPortal from "../AnnouncementPortal/AnnouncementPortal";

import {
    createOrGetDirect,
    getUserConversations,
    createGroup,
} from "../../services/conversationService";

import "./WidgetContainer.css";

import { initializeConfig } from "../../services/config";
import { initializeApi } from "../../services/api";

import ThemeSwitcher from "../ThemeSwitcher/ThemeSwitcher";
import "../ThemeSwitcher/ThemeSwitcher.css";


/*
 * =========================================================
 * Helpers
 * =========================================================
 */

const normalizeId = (id) => {
    if (id === null || id === undefined) {
        return null;
    }

    return id.toString();
};


const getLastMessagePreview = (message) => {

    if (!message) {
        return "";
    }

    if (message.isDeleted) {
        return "Message deleted";
    }

    if (message.messageType === "file") {
        return `📎 ${
            message.attachment?.fileName ||
            message.attachment?.originalName ||
            "File"
        }`;
    }

    return message.content || "";
};


/*
 * =========================================================
 * Widget Container
 * =========================================================
 */

function WidgetContainer({
    currentUser,
    users,
    serverUrl,
    platformId,
    features,
    onClose,
    theme = "light",
    onThemeChange,
}) {
    
    console.log("widget entered ",platformId);

    const senderId = currentUser?.userId;


    const isFeatureEnabled = (featureName) => {
        return features?.[featureName] === true;
    };


    /*
     * =========================================================
     * State
     * =========================================================
     */

    const [isMobile, setIsMobile] =
        useState(() =>
            window.matchMedia(
                "(max-width: 768px)"
            ).matches
        );


    const [message, setMessage] =
        useState("");


    const [messages, setMessages] =
        useState([]);


    const [conversationId, setConversationId] =
        useState(null);


    const [conversations, setConversations] =
        useState([]);


    const [
        selectedConversation,
        setSelectedConversation,
    ] = useState(null);


    const [
        mentionedConversations,
        setMentionedConversations,
    ] = useState(new Set());


    const [searchText, setSearchText] =
        useState("");


    const [isChatModalOpen, setIsChatModalOpen] =
        useState(false);


    const [isGroupModalOpen, setIsGroupModalOpen] =
        useState(false);


    const [showChat, setShowChat] =
        useState(false);


    const [activeSection, setActiveSection] =
        useState("chat");


    /*
     * =========================================================
     * Refs
     * =========================================================
     */

    const selectedConversationRef =
        useRef(null);


    const loadRequestRef =
        useRef(0);


    const conversationLoadRequestRef =
        useRef(0);


    /*
     * =========================================================
     * Mobile viewport
     * =========================================================
     */

    useEffect(() => {

        const mediaQuery =
            window.matchMedia(
                "(max-width: 768px)"
            );


        const handleViewportChange = (
            event
        ) => {

            setIsMobile(
                event.matches
            );

        };


        mediaQuery.addEventListener(
            "change",
            handleViewportChange
        );


        return () => {

            mediaQuery.removeEventListener(
                "change",
                handleViewportChange
            );

        };

    }, []);


    /*
     * =========================================================
     * Initialize API + Socket
     * =========================================================
     */

    useEffect(() => {

        if (!serverUrl || !senderId || !platformId) {
            return;
        }


        initializeConfig(
            serverUrl
        );


        initializeApi();


        initializeSocket(
            senderId,
            platformId,
        );

    }, [
        serverUrl,
        senderId,
        platformId,
    ]);


    /*
     * =========================================================
     * Refresh conversations from Cassandra
     *
     * Cassandra is source of truth.
     * =========================================================
     */

    const refreshConversations =
        useCallback(async () => {

            if (!senderId) {
                return;
            }


            const requestId =
                ++conversationLoadRequestRef.current;


            try {

                const updatedConversations =
                    await getUserConversations(
                        senderId,
                        platformId
                    );


                /*
                 * Ignore stale response.
                 */

                if (
                    requestId !==
                    conversationLoadRequestRef.current
                ) {
                    return;
                }


                setConversations(
                    updatedConversations || []
                );


                /*
                * =====================================================
                * Preserve local mention badges.
                *
                * A locally detected mention must remain visible until
                * the user explicitly opens that conversation.
                *
                * Cassandra hasMention values can add badges, but a
                * refresh must never remove an existing local badge.
                * =====================================================
                */

                const mentionedIdsFromServer =
                    (updatedConversations || [])
                        .filter(
                            (conversation) =>
                                conversation.hasMention
                        )
                        .map(
                            (conversation) =>
                                normalizeId(
                                    conversation.conversationId
                                )
                        )
                        .filter(Boolean);


                setMentionedConversations(
                    (previousMentions) => {

                        const updatedMentions =
                            new Set(
                                previousMentions
                            );


                        /*
                        * Add any mention information received
                        * from Cassandra.
                        *
                        * Do NOT clear existing local mentions here.
                        */

                        mentionedIdsFromServer.forEach(
                            (conversationId) => {

                                updatedMentions.add(
                                    conversationId
                                );

                            }
                        );


                        return updatedMentions;

                    }
                );

            } catch (error) {

                console.error(
                    "Failed to refresh conversations:",
                    error
                );

            }

        }, [
            senderId,
            platformId,
        ]);
    const delay = (milliseconds) =>
        new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    milliseconds
                )
        );


    const refreshConversationsWithRetry =
        useCallback(
            async (
                expectedConversationId = null
            ) => {

                const attempts = [
                    0,
                    150,
                    350,
                ];


                for (
                    let index = 0;
                    index < attempts.length;
                    index++
                ) {

                    if (
                        attempts[index] > 0
                    ) {

                        await delay(
                            attempts[index]
                        );

                    }


                    await refreshConversations();


                    /*
                    * No specific conversation expected.
                    */

                    if (
                        !expectedConversationId
                    ) {

                        return;

                    }


                    /*
                    * Check whether conversation
                    * exists after refresh.
                    */

                    const expectedId =
                        normalizeId(
                            expectedConversationId
                        );


                    if (
                        !expectedId
                    ) {

                        return;

                    }

                }

            },
            [
                refreshConversations,
            ]
        );


    /*
     * =========================================================
     * Update conversation from realtime message
     *
     * IMPORTANT:
     * This is the primary realtime sidebar update.
     * No API request is required for an existing conversation.
     * =========================================================
     */

    const updateConversationFromMessage =
        useCallback(
            (newMessage) => {

                if (!newMessage) {
                    return;
                }


                const newConversationId =
                    normalizeId(
                        newMessage.conversationId
                    );


                if (!newConversationId) {
                    return;
                }


                const lastMessage =
                    getLastMessagePreview(
                        newMessage
                    );


                const lastMessageTime =
                    newMessage.createdAt ||
                    newMessage.updatedAt ||
                    new Date().toISOString();


                const msgSenderId = normalizeId(newMessage.senderId);
                const myUserId = normalizeId(senderId);

                if (msgSenderId !== myUserId && newMessage.content) {
                    const isCurrentlyOpen =
                        normalizeId(selectedConversationRef.current) ===
                        newConversationId;

                    if (!isCurrentlyOpen) {
                        const currentUserName = currentUser?.displayName?.trim();
                        const currentUserIdStr = currentUser?.userId?.toString()?.trim();

                        const wasMentioned = [currentUserName, currentUserIdStr].some(
                            (name) => {
                                if (!name) return false;
                                const escaped = name.replace(
                                    /[.*+?^${}()|[\]\\]/g,
                                    "\\$&"
                                );
                                return new RegExp(
                                    `@${escaped}(?=\\s|$|[.,!?])`,
                                    "i"
                                ).test(newMessage.content);
                            }
                        );

                        if (wasMentioned) {
                            setMentionedConversations((prevMentions) => {
                                const updatedMentions = new Set(prevMentions);
                                updatedMentions.add(newConversationId);
                                return updatedMentions;
                            });
                        }
                    }
                }

                let conversationFound =
                    false;


                setConversations(
                    (previousConversations) => {

                        const existingIndex =
                            previousConversations.findIndex(
                                (conversation) =>
                                    normalizeId(
                                        conversation.conversationId
                                    ) ===
                                    newConversationId
                            );


                        /*
                        * Inactive/new conversation is
                        * not available in current local state.
                        */

                        if (
                            existingIndex === -1
                        ) {

                            return previousConversations;

                        }


                        conversationFound =
                            true;


                        const existingConversation =
                            previousConversations[
                                existingIndex
                            ];


                        const updatedConversation = {

                            ...existingConversation,

                            lastMessage,

                            lastMessageTime,

                        };


                        /*
                        * Latest message conversation
                        * always moves to the top.
                        */

                        return [

                            updatedConversation,

                            ...previousConversations.filter(
                                (
                                    _conversation,
                                    index
                                ) =>
                                    index !==
                                    existingIndex
                            ),

                        ];

                    }
                );


                /*
                * Keep selected conversation metadata
                * concurrent with sidebar.
                */

                if (
                    normalizeId(
                        selectedConversationRef.current
                    ) ===
                    newConversationId
                ) {

                    setSelectedConversation(
                        (previousConversation) => {

                            if (
                                !previousConversation
                            ) {

                                return previousConversation;

                            }


                            if (
                                normalizeId(
                                    previousConversation.conversationId
                                ) !==
                                newConversationId
                            ) {

                                return previousConversation;

                            }


                            return {

                                ...previousConversation,

                                lastMessage,

                                lastMessageTime,

                            };

                        }
                    );

                }


                /*
                * If conversation was not locally present,
                * fetch it after realtime state update.
                */

                if (
                    !conversationFound
                ) {

                    refreshConversationsWithRetry(
                        newConversationId
                    );

                }

            },
            [
                refreshConversationsWithRetry,
            ]
        );


    /*
     * =========================================================
     * Socket listeners
     * =========================================================
     */

    useEffect(() => {

        if (!senderId || !serverUrl) {
            return;
        }


        let socket;


        try {

            socket =
                getSocket();

        } catch (error) {

            console.error(
                "Socket is not initialized:",
                error
            );

            return;
        }


        /*
         * Initial conversation load.
         */

        refreshConversations();


        /*
         * =====================================================
         * conversationUpdated
         * =====================================================
         *
         * Backend sends this event to participant personal
         * rooms after a message is created.
         *
         * We DO NOT blindly call refreshConversations()
         * because a REST response can race with newMessage
         * and overwrite the realtime local state.
         */

        const handleConversationUpdated =
            async (data) => {

                console.log(
                    "FRONTEND conversationUpdated RECEIVED:",
                    data
                );


                const updatedConversationId =
                    normalizeId(
                        data?.conversationId
                    );


                if (
                    !updatedConversationId
                ) {

                    return;

                }


                /*
                * If complete message comes from backend,
                * update sidebar instantly.
                */

                if (
                    data?.latestMessage
                ) {

                    updateConversationFromMessage(
                        data.latestMessage
                    );

                    return;

                }


                /*
                * Backend only provides conversation metadata.
                *
                * Fetch Cassandra state with retries because
                * socket event can arrive before the Cassandra
                * read is immediately consistent.
                */

                await refreshConversationsWithRetry(
                    updatedConversationId
                );

            };


        /*
         * =====================================================
         * newMessage
         * =====================================================
         */

        const handleNewMessage =
            (newMessage) => {

                if (!newMessage) {
                    return;
                }


                const newConversationId =
                    normalizeId(
                        newMessage.conversationId
                    );


                if (!newConversationId) {
                    return;
                }


                /*
                * =================================================
                * Update sidebar immediately.
                * =================================================
                */

                updateConversationFromMessage(
                    newMessage
                );


                const currentConversationId =
                    normalizeId(
                        selectedConversationRef.current
                    );


                /*
                * =================================================
                * Mention handling.
                * Only unread/inactive conversations receive badge.
                * =================================================
                */

                const currentUserName =
                    currentUser?.displayName?.trim();


                if (
                    currentConversationId !==
                    newConversationId
                ) {

                    if (
                        currentUserName &&
                        newMessage.content
                    ) {

                        const escapedName =
                            currentUserName.replace(
                                /[.*+?^${}()|[\]\\]/g,
                                "\\$&"
                            );


                        const mentionRegex =
                            new RegExp(
                                `@${escapedName}(?=\\s|$|[.,!?])`,
                                "i"
                            );


                        const wasMentioned =
                            mentionRegex.test(
                                newMessage.content
                            );


                        if (
                            wasMentioned
                        ) {

                            setMentionedConversations(
                                (previousMentions) => {

                                    const updatedMentions =
                                        new Set(
                                            previousMentions
                                        );


                                    updatedMentions.add(
                                        newConversationId
                                    );


                                    return updatedMentions;

                                }
                            );

                        }

                    }

                }


                /*
                * =================================================
                * Only add message to visible chat if this
                * conversation is currently open.
                * =================================================
                */

                if (
                    currentConversationId !==
                    newConversationId
                ) {

                    return;

                }


                setMessages(
                    (previousMessages) => {

                        const newMessageId =
                            normalizeId(
                                newMessage._id
                            );


                        /*
                        * Some backends can emit duplicate events.
                        */

                        const exists =
                            previousMessages.some(
                                (existingMessage) =>
                                    normalizeId(
                                        existingMessage._id
                                    ) ===
                                    newMessageId
                            );


                        if (exists) {

                            return previousMessages;

                        }


                        const nextMessages = [

                            ...previousMessages,

                            newMessage,

                        ];


                        nextMessages.sort(
                            (firstMessage, secondMessage) =>
                                new Date(
                                    firstMessage.createdAt
                                ) -
                                new Date(
                                    secondMessage.createdAt
                                )
                        );


                        return nextMessages;

                    }
                );

            };


        /*
         * =====================================================
         * Edited message
         * =====================================================
         */

        const handleMessageUpdated =
            (updatedMessage) => {

                if (!updatedMessage) {
                    return;
                }


                const updatedConversationId =
                    normalizeId(
                        updatedMessage.conversationId
                    );


                /*
                 * Update currently loaded messages.
                 */

                setMessages(
                    (prev) =>
                        prev.map(
                            (msg) =>
                                normalizeId(
                                    msg._id
                                ) ===
                                normalizeId(
                                    updatedMessage._id
                                )
                                    ? updatedMessage
                                    : msg
                        )
                );


                /*
                 * Refresh sidebar.
                 *
                 * This handles the case where the edited
                 * message is the latest message.
                 */

                refreshConversations();


                /*
                 * Mention handling.
                 */

                const currentUserName =
                    currentUser?.displayName?.trim();


                if (
                    currentUserName &&
                    updatedMessage.content
                ) {

                    const escapedName =
                        currentUserName.replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        );


                    const mentionRegex =
                        new RegExp(
                            `@${escapedName}(?=\\s|$|[.,!?])`,
                            "i"
                        );


                    if (
                        mentionRegex.test(
                            updatedMessage.content
                        ) &&
                        updatedConversationId
                    ) {

                        setMentionedConversations(
                            (prev) => {

                                const updated =
                                    new Set(prev);


                                updated.add(
                                    updatedConversationId
                                );


                                return updated;

                            }
                        );

                    }

                }

            };


        /*
         * =====================================================
         * Deleted message
         * =====================================================
         */

        const handleMessageDeleted =
            (deletedMessage) => {

                if (!deletedMessage) {
                    return;
                }


                /*
                 * Update currently loaded messages.
                 */

                setMessages(
                    (prev) =>
                        prev.map(
                            (msg) =>
                                normalizeId(
                                    msg._id
                                ) ===
                                normalizeId(
                                    deletedMessage._id
                                )
                                    ? deletedMessage
                                    : msg
                        )
                );


                /*
                 * Cassandra determines actual latest
                 * message after deletion.
                 */

                refreshConversations();

            };


        /*
         * =====================================================
         * Register socket listeners
         * =====================================================
         */

        socket.on(
            "conversationUpdated",
            handleConversationUpdated
        );


        socket.on(
            "newMessage",
            handleNewMessage
        );


        socket.on(
            "messageUpdated",
            handleMessageUpdated
        );


        socket.on(
            "messageDeleted",
            handleMessageDeleted
        );


        /*
         * =====================================================
         * Cleanup
         * =====================================================
         */

        return () => {

            conversationLoadRequestRef.current++;


            socket.off(
                "conversationUpdated",
                handleConversationUpdated
            );


            socket.off(
                "newMessage",
                handleNewMessage
            );


            socket.off(
                "messageUpdated",
                handleMessageUpdated
            );


            socket.off(
                "messageDeleted",
                handleMessageDeleted
            );

        };

    }, [
        senderId,
        serverUrl,
        currentUser?.displayName,
        refreshConversations,
        refreshConversationsWithRetry,
        updateConversationFromMessage,
    ]);


    /*
     * =========================================================
     * Leave active conversation on unmount
     * =========================================================
     */

    useEffect(() => {

        return () => {

            const activeConversationId =
                selectedConversationRef.current;


            if (!activeConversationId) {
                return;
            }


            try {

                const socket =
                    getSocket();


                socket.emit(
                    "leaveConversation",
                    {
                        conversationId: activeConversationId,
                        platformId,
                    }
                );

            } catch (error) {

                console.error(
                    "Failed to leave conversation:",
                    error
                );

            }


            selectedConversationRef.current =
                null;

        };

    }, []);


    /*
     * =========================================================
     * Load messages whenever conversation changes
     * =========================================================
     */

    useEffect(() => {

        if (!selectedConversation) {
            return;
        }


        const selectedConversationId =
            normalizeId(
                selectedConversation.conversationId
            );


        if (!selectedConversationId) {
            return;
        }


        const requestId =
            ++loadRequestRef.current;


        const loadConversation =
            async () => {

                try {

                    const socket =
                        getSocket();


                    /*
                     * Leave previous conversation.
                     */

                    const previousConversationId =
                        selectedConversationRef.current;


                    if (
                        socket &&
                        previousConversationId &&
                        previousConversationId !==
                            selectedConversationId
                    ) {

                        socket.emit(
                            "leaveConversation",
                            {
                                conversationId: previousConversationId,
                                platformId,
                            }
                        );

                    }


                    /*
                     * Update ref BEFORE joining.
                     */

                    selectedConversationRef.current =
                        selectedConversationId;


                    /*
                     * Join selected conversation.
                     */

                    socket.emit(
                        "joinConversation",
                        {
                            conversationId: selectedConversationId,
                            platformId,
                        }
                    );


                    setConversationId(
                        selectedConversationId
                    );


                    /*
                     * Clear old messages.
                     */

                    setMessages([]);


                    /*
                     * Load history.
                     */

                    const previousMessages =
                        await getMessages(
                            selectedConversationId,
                            platformId
                        );


                    /*
                     * Ignore stale request.
                     */

                    if (
                        requestId !==
                        loadRequestRef.current
                    ) {
                        return;
                    }


                    /*
                     * Merge REST history with messages
                     * received over socket while loading.
                     */

                    setMessages(
                        (currentMessages) => {

                            const merged = [
                                ...(previousMessages || []),
                                ...currentMessages,
                            ];


                            const unique =
                                Array.from(
                                    new Map(
                                        merged.map(
                                            (msg) => [
                                                normalizeId(
                                                    msg._id
                                                ),
                                                msg,
                                            ]
                                        )
                                    ).values()
                                );


                            unique.sort(
                                (a, b) =>
                                    new Date(
                                        a.createdAt
                                    ) -
                                    new Date(
                                        b.createdAt
                                    )
                            );


                            return unique;

                        }
                    );

                } catch (error) {

                    console.error(
                        "Failed to load messages:",
                        error
                    );

                }

            };


        loadConversation();


        return () => {

            loadRequestRef.current++;

        };

    }, [
        selectedConversation,
    ]);


    /*
     * =========================================================
     * Send message
     * =========================================================
     */

    const sendMessage = (
        fileData = null
    ) => {

        if (!conversationId) {
            return;
        }


        const socket =
            getSocket();


        if (!socket) {

            console.error(
                "Socket is not initialized"
            );

            return;
        }


        /*
         * File message.
         */

        if (fileData) {

            return new Promise(
                (
                    resolve,
                    reject
                ) => {

                    socket.emit(
                        "sendMessage",
                        {
                            conversationId,
                            senderId,
                            platformId,
                            content: "",
                            messageType:
                                fileData.messageType,
                            attachment:
                                fileData.attachment,
                        },
                        (response) => {

                            if (
                                response?.ok
                            ) {

                                resolve(
                                    response.message
                                );

                                return;
                            }


                            reject(
                                new Error(
                                    response?.message ||
                                    "Message could not be sent"
                                )
                            );

                        }
                    );

                }
            );

        }


        /*
         * Text message.
         */

        if (!message.trim()) {
            return;
        }


        socket.emit(
            "sendMessage",
            {
                conversationId,
                senderId,
                platformId,
                content:
                    message.trim(),
                messageType:
                    "text",
            }
        );


        setMessage("");

    };


    /*
     * =========================================================
     * Select conversation
     * =========================================================
     */

    const handleConversationSelect =
        (conversation) => {

            const selectedId =
                normalizeId(
                    conversation.conversationId
                );


            if (!selectedId) {
                return;
            }


            selectedConversationRef.current =
                selectedId;




            /*
             * Clear mention badge.
             */

            setMentionedConversations(
                (prev) => {

                    const updated =
                        new Set(prev);


                    updated.delete(
                        selectedId
                    );


                    return updated;

                }
            );


            if (isMobile) {

                setShowChat(
                    true
                );

            }
             setSelectedConversation(
                conversation
            );


        };


    /*
     * =========================================================
     * Start direct chat
     * =========================================================
     */

    const handleStartChat =
        async (
            targetUserId
        ) => {

            try {

                const session =
                    await createOrGetDirect(
                    senderId,
                    targetUserId,
                    platformId
                );


                const updatedConversations =
                    await getUserConversations(
                        senderId,
                        platformId
                    );


                setConversations(
                    updatedConversations || []
                );


                const conversation =
                    updatedConversations.find(
                        (item) =>
                            normalizeId(
                                item.conversationId
                            ) ===
                            normalizeId(
                                session.conversationId
                            )
                    );


                if (conversation) {

                    selectedConversationRef.current =
                        normalizeId(
                            conversation.conversationId
                        );


                    setSelectedConversation(
                        conversation
                    );


                    if (isMobile) {

                        setShowChat(
                            true
                        );

                    }

                }


                setIsChatModalOpen(
                    false
                );

            } catch (error) {

                console.error(
                    "Failed to start chat:",
                    error
                );

                throw error;

            }

        };


    /*
     * =========================================================
     * Create group
     * =========================================================
     */

    const handleStartGroupChat =
        async (
            groupName,
            participants
        ) => {

            try {

                const newGroup =
                    await createGroup(
                    groupName,
                    senderId,
                    participants,
                    platformId
                );


                const updatedConversations =
                    await getUserConversations(
                        senderId,
                        platformId
                    );


                setConversations(
                    updatedConversations || []
                );


                const conversation =
                    updatedConversations.find(
                        (item) =>
                            normalizeId(
                                item.conversationId
                            ) ===
                            normalizeId(
                                newGroup.conversationId
                            )
                    );


                if (conversation) {

                    selectedConversationRef.current =
                        normalizeId(
                            conversation.conversationId
                        );


                    setSelectedConversation(
                        conversation
                    );


                    if (isMobile) {

                        setShowChat(
                            true
                        );

                    }

                }


                setIsGroupModalOpen(
                    false
                );

            } catch (error) {

                console.error(
                    "Failed to create group:",
                    error
                );

                throw error;

            }

        };


    /*
     * =========================================================
     * Edit message
     * =========================================================
     */

    const handleEditMessage =
        (
            messageId,
            content
        ) => {

            if (!content.trim()) {
                return;
            }


            const socket =
                getSocket();


            if (!socket) {

                console.error(
                    "Socket is not initialized"
                );

                return;
            }


            socket.emit(
                "editMessage",
                {
                    messageId,
                    senderId,
                    platformId,
                    content:
                        content.trim(),
                }
            );

        };


    /*
     * =========================================================
     * Delete message
     * =========================================================
     */

    const handleDeleteMessage =
        (
            messageId
        ) => {

            const socket =
                getSocket();


            if (!socket) {

                console.error(
                    "Socket is not initialized"
                );

                return;
            }


            socket.emit(
                "deleteMessage",
                {
                    messageId,
                    senderId,
                    platformId,
                }
            );

        };


    /*
     * =========================================================
     * Search
     * =========================================================
     */

    const filteredConversations = conversations.filter(
        (conversation) => {
        const matchesSearch =
        conversation.displayName
        ?.toLowerCase()
        .includes(
        searchText.toLowerCase()
        );


            const matchesFeatureConfiguration =
                (conversation.type === "direct" &&
                    isFeatureEnabled("chat")) ||
                (conversation.type === "group" &&
                    isFeatureEnabled("groupChat"));

            return (
                matchesSearch &&
                matchesFeatureConfiguration
            );
        }
    );



    /*
     * =========================================================
     * UI
     * =========================================================
     */

    return (

        <div
            className="rtc-widget-container"
            data-theme={theme}
        >

            <button
                type="button"
                className="rtc-widget-close-button"
                onClick={onClose}
                aria-label="Close communication widget"
                title="Close widget"
            >
                ×
            </button>


            {/* ==========================================
                Conversation Sidebar
            ========================================== */}

            {activeSection === "chat" && (

                <div
                    className={`rtc-sidebar ${
                        isMobile &&
                        showChat
                            ? "rtc-hide-mobile"
                            : ""
                    }`}
                >

                    <div className="rtc-sidebar-header">

                        <div className="rtc-sidebar-title">

                            <h3>
                                Current User:{" "}
                                {
                                    currentUser?.displayName
                                }
                            </h3>


                            <span>
                                {
                                    conversations.length
                                }
                            </span>


                            <ThemeSwitcher
                                theme={
                                    theme
                                }
                                onChange={
                                    onThemeChange
                                }
                            />

                        </div>


                        <div className="rtc-sidebar-buttons">

                            {isFeatureEnabled("chat") && (
                                <button
                                    type="button"
                                    onClick={() => setIsChatModalOpen(true)}
                                >
                                    💬 Chat
                                </button>
                            )}


                            {isFeatureEnabled("groupChat") && (
                                <button
                                    type="button"
                                    onClick={() => setIsGroupModalOpen(true)}
                                >
                                    👥 Group
                                </button>
                            )}


                            {isFeatureEnabled("announcements") && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setActiveSection("announcements")
                                    }
                                >
                                    📢 Announcements
                                </button>
                            )}

                        </div>


                        <input
                            className="rtc-conversation-search"
                            type="text"
                            placeholder="🔍 Search conversations..."
                            value={
                                searchText
                            }
                            onChange={(e) =>
                                setSearchText(
                                    e.target.value
                                )
                            }
                        />

                    </div>


                    <ConversationList

                        conversations={
                            filteredConversations
                        }

                        selectedConversation={
                            selectedConversation
                        }

                        setSelectedConversation={
                            handleConversationSelect
                        }

                        mentionedConversations={
                            mentionedConversations
                        }

                    />

                </div>

            )}


            {/* ==========================================
                Chat
            ========================================== */}

            {activeSection === "chat" && (

                <div
                    className={`rtc-chat-section ${
                        isMobile
                            ? showChat
                                ? "rtc-show-mobile"
                                : ""
                            : ""
                    }`}
                >

                    <ChatWindow
                        features={features}
                        messages={
                            messages
                        }

                        message={
                            message
                        }

                        setMessage={
                            setMessage
                        }

                        sendMessage={
                            sendMessage
                        }

                        serverUrl={
                            serverUrl
                        }

                        selectedConversation={
                            selectedConversation
                        }

                        currentUser={
                            currentUser
                        }

                        users={
                            users
                        }

                        platformId={platformId}

                        onBack={() => {

                            const activeConversationId =
                                selectedConversationRef.current;


                            if (
                                activeConversationId
                            ) {

                                try {

                                    getSocket().emit(
                                        "leaveConversation",
                                        {
                                            conversationId: activeConversationId,
                                            platformId,
                                        }
                                    );

                                } catch (error) {

                                    console.error(
                                        "Failed to leave conversation:",
                                        error
                                    );

                                }

                            }


                            setShowChat(
                                false
                            );


                            setSelectedConversation(
                                null
                            );


                            setConversationId(
                                null
                            );


                            setMessages(
                                []
                            );


                            selectedConversationRef.current =
                                null;

                        }}


                        onEditMessage={
                            handleEditMessage
                        }


                        onDeleteMessage={
                            handleDeleteMessage
                        }

                    />

                </div>

            )}


            {/* ==========================================
                Announcements
            ========================================== */}

            {activeSection === "announcements" && (

                <div
                    className="rtc-announcement-section"
                >

                    <AnnouncementPortal

                        currentUser={
                            currentUser
                        }

                        users={
                            users
                        }

                        platformId={platformId}

                        onBack={() =>
                            setActiveSection(
                                "chat"
                            )
                        }

                    />

                </div>

            )}


            {/* ==========================================
                New Chat Modal
            ========================================== */}

            <NewChatModal

                currentUser={
                    senderId
                }

                users={
                    users
                }

                isOpen={
                    isChatModalOpen
                }

                onClose={() =>
                    setIsChatModalOpen(
                        false
                    )
                }

                onStartChat={
                    handleStartChat
                }

            />


            {/* ==========================================
                New Group Modal
            ========================================== */}

            <NewGroupModal

                currentUser={
                    senderId
                }

                users={
                    users
                }

                isOpen={
                    isGroupModalOpen
                }

                onClose={() =>
                    setIsGroupModalOpen(
                        false
                    )
                }

                onCreateGroup={
                    handleStartGroupChat
                }

            />

        </div>

    );

}


export default WidgetContainer;