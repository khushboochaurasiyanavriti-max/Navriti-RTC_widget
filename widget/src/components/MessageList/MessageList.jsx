import { useEffect, useRef } from "react";

import MessageItem from "../MessageItem/MessageItem";
import "./MessageList.css";

function MessageList({
    messages,
    currentUser,
    onEditMessage,
    onDeleteMessage,
}) {
    const messagesEndRef = useRef(null);

    const previousMessageCountRef =
        useRef(messages.length);

    useEffect(() => {
        const previousCount =
            previousMessageCountRef.current;

        const currentCount = messages.length;

        /*
         * Scroll to bottom when:
         *
         * 1. First messages are loaded
         * 2. A new message is added
         *
         * Don't automatically scroll for edits/deletes
         * because message count doesn't change.
         */

        if (currentCount > previousCount) {
            messagesEndRef.current?.scrollIntoView({
                behavior:"auto",
            });
        }

        previousMessageCountRef.current =
            currentCount;

    }, [messages.length]);

    return (
        <div className="rtc-message-list">

            {messages.map((msg) => (
                <MessageItem
                    key={msg._id}
                    message={msg}
                    currentUser={currentUser}
                    onEditMessage={onEditMessage}
                    onDeleteMessage={onDeleteMessage}
                />
            ))}

            <div ref={messagesEndRef} />

        </div>
    );
}

export default MessageList;