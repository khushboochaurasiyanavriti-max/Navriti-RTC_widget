import ConversationItem from "../ConversationItem/ConversationItem";
import "./ConversationList.css";

function ConversationList({
    conversations,
    selectedConversation,
    setSelectedConversation,
    mentionedConversations,
}) {
    const selectedId =
        selectedConversation?.conversationId?.toString();

    return (
        <div className="rtc-conversation-list">

            {conversations.map((conversation) => {
                const conversationId =
                    conversation.conversationId?.toString();

                const isMentioned =
                    mentionedConversations?.has(
                        conversationId
                    );

                const isSelected =
                    selectedId === conversationId;

                return (
                    <div
                        key={conversationId}
                        className="rtc-conversation-wrapper"
                    >
                        <ConversationItem
                            conversation={conversation}
                            selected={isSelected}
                            onClick={() =>
                                setSelectedConversation(
                                    conversation
                                )
                            }
                        />

                        {isMentioned && (
                            <span className="rtc-mention-badge">
                                @
                            </span>
                        )}
                    </div>
                );
            })}

        </div>
    );
}

export default ConversationList;