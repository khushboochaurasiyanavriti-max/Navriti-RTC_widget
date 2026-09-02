import "./ConversationItem.css";

function formatConversationTime(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();

    const isToday =
        date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
        date.toDateString() ===
        yesterday.toDateString();

    if (isYesterday) {
        return "Yesterday";
    }

    const isSameYear =
        date.getFullYear() === now.getFullYear();

    if (isSameYear) {
        return date.toLocaleDateString([], {
            month: "short",
            day: "numeric",
        });
    }

    return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function ConversationItem({
    conversation,
    selected,
    onClick,
}) {
    const avatar =
        conversation.type === "group"
            ? "👥"
            : conversation.displayName
                  ?.charAt(0)
                  .toUpperCase() || "?";

    const formattedTime =
        formatConversationTime(
            conversation.lastMessageTime
        );

    return (
        <div
            className={`rtc-conversation-item ${
                selected ? "selected" : ""
            }`}
            onClick={onClick}
        >
            <div className="rtc-conversation-avatar">
                {avatar}
            </div>

            <div className="rtc-conversation-content">
                <div className="rtc-conversation-top">

                    <div className="rtc-conversation-name">
                        {conversation.displayName ||
                            "Unknown"}
                    </div>

                    <div className="rtc-conversation-time">
                        {formattedTime}
                    </div>

                </div>

                <div className="rtc-conversation-preview">
                    {conversation.lastMessage ||
                        "No messages yet"}
                </div>
            </div>
        </div>
    );
}

export default ConversationItem;