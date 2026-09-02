import { useEffect, useState } from "react";

import MessageList from "../MessageList/MessageList";
import ChatInput from "../ChatInput/ChatInput";
import MembersPanel from "../MembersPanel/MembersPanel";
import ScreenShare from "../ScreenShare/ScreenShare";

import "./ChatWindow.css";


function ChatWindow({
    messages,
    message,
    setMessage,
    sendMessage,
    serverUrl,
    selectedConversation,
    currentUser,
    users,
    onBack,
    onEditMessage,
    onDeleteMessage,
}) {
    const [showMembers, setShowMembers] =
        useState(false);
    const [showScreenShare, setShowScreenShare] = 
        useState(false);



    /*
     * -----------------------------------------
     * Close members panel when conversation
     * changes
     * -----------------------------------------
     */

    useEffect(() => {
        setShowMembers(false);
        setShowScreenShare(false);
    }, [selectedConversation?.conversationId]);


    /*
     * -----------------------------------------
     * Find members of current conversation
     *
     * Backend now returns:
     *
     * participants: [
     *     {
     *         userId,
     *         displayName
     *     }
     * ]
     *
     * So compare participant.userId
     * instead of participant directly.
     * -----------------------------------------
     */

    const conversationMembers =
        users.filter((user) =>
            selectedConversation?.participants?.some(
                (participantId) =>
                    participantId?.toString() ===
                    user.userId?.toString()
            )
        );


    /*
     * -----------------------------------------
     * No Conversation Selected
     * -----------------------------------------
     */

    if (!selectedConversation) {
        return (
            <div className="rtc-chat-widget rtc-empty-chat">

                <div className="rtc-empty-chat-content">

                    <div className="rtc-empty-icon">
                        💬
                    </div>

                    <h2>
                        No Conversation Selected
                    </h2>

                    <p>
                        Select a conversation from the
                        left or start a new chat.
                    </p>

                </div>

            </div>
        );
    }


    return (
        <div className="rtc-chat-widget">


            {/* ================================
                Chat Header
            ================================= */}

            <div className="rtc-chat-header">


                {/* Back Button */}

                <button
                    type="button"
                    className="rtc-chat-back-button"
                    onClick={onBack}
                    aria-label="Close conversation"
                >

                    <span className="rtc-back-mobile">
                        ←
                    </span>

                    <span className="rtc-back-desktop">
                        ✕
                    </span>

                </button>


                {/* Chat Avatar */}

                <div className="rtc-chat-avatar">

                    {selectedConversation.type === "group"
                        ? "👥"
                        : "👤"}

                </div>


                {/* Chat Details */}

                <div className="rtc-chat-details">

                    <h2>
                        {selectedConversation.displayName ||
                            "Unknown"}
                    </h2>

                    <p>
                        {selectedConversation.type === "group"
                            ? "Group Conversation"
                            : "Direct Conversation"}
                    </p>

                </div>


                {/* Screen Share */}

                <button
                    type="button"
                    className={`rtc-call-toggle-button ${
                        showScreenShare
                            ? "active"
                            : ""
                    }`}
                    onClick={() =>
                        setShowScreenShare(
                            (prev) => !prev
                        )
                    }
                    aria-label={
                        showScreenShare
                            ? "Back to chat"
                            : "Open screen sharing"
                    }
                    title={
                        showScreenShare
                            ? "Back to chat"
                            : "Screen sharing"
                    }
                >
                    {showScreenShare
                        ? "←"
                        : "▣"}
                </button>


                {/* Three Dot / Members Toggle */}

                <button
                    type="button"
                    className="rtc-chat-menu-button"
                    onClick={() =>
                        setShowMembers(
                            (prev) => !prev
                        )
                    }
                    aria-label="Toggle members"
                    aria-expanded={showMembers}
                >
                    ⋮
                </button>

            </div>


            {/* ================================
                Members Panel
            ================================= */}

            {showMembers && (
                <MembersPanel
                    members={conversationMembers}
                    currentUser={currentUser}
                />
            )}


            {/* ================================
                CHAT SPACE
            ================================= */}

            {!showScreenShare && (
                <>
                    <MessageList
                        messages={messages}
                        currentUser={currentUser}
                        onEditMessage={onEditMessage}
                        onDeleteMessage={onDeleteMessage}
                    />

                    <ChatInput
                        message={message}
                        setMessage={setMessage}
                        sendMessage={sendMessage}
                        serverUrl={serverUrl}
                        users={users}
                        currentUser={currentUser}
                        selectedConversation={
                            selectedConversation
                        }
                    />
                </>
            )}


            {/* ================================
                SCREEN SHARE SPACE
            ================================= */}

            <div
                className={`rtc-screen-share-space ${
                    showScreenShare
                        ? "visible"
                        : ""
                }`}
            >
                <ScreenShare
                    conversationId={
                        selectedConversation.conversationId
                    }
                    currentUser={currentUser}
                    participantIds={users}
                    booleanConnection={showScreenShare}
                />
            </div>

        </div>
    );
}


export default ChatWindow;