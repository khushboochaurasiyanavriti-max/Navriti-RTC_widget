import { useEffect, useState } from "react";
import "./MessageItem.css";
const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const getFileIcon = (fileType) => {
    if (!fileType) {
        return "📎";
    }

    if (fileType === "application/pdf") {
        return "📄";
    }

    if (
        fileType === "application/vnd.ms-excel" ||
        fileType ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
        return "📊";
    }

    if (
        fileType === "application/msword" ||
        fileType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        return "📝";
    }

    if (
        fileType === "application/zip" ||
        fileType === "application/x-zip-compressed"
    ) {
        return "🗜️";
    }

    if (fileType === "text/plain") {
        return "📃";
    }

    return "📎";
};

function MessageItem({
    message,
    currentUser,
    onEditMessage,
    onDeleteMessage,
}) {
    const [isEditing, setIsEditing] =
        useState(false);

    const [editContent, setEditContent] =
        useState(message.content);

    
    /*
     * Keep edit input synchronized if
     * another client edits this message.
     */

    useEffect(() => {
        setEditContent(message.content);
    }, [message.content]);


    /*
     * Message time
     */

    const time = new Date(
        message.createdAt
    ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });


    /*
     * Check whether this is current user's message
     */

    const isMine =
        message.senderId ===
        currentUser?.userId;


    /*
     * Start editing
     */

    const handleEdit = () => {
        setEditContent(message.content);
        setIsEditing(true);
    };


    /*
     * Save edit
     */

    const handleSaveEdit = () => {
        const trimmedContent =
            editContent.trim();

        if (!trimmedContent) {
            return;
        }

        /*
         * Send edit request through parent.
         */

        onEditMessage(
            message._id,
            trimmedContent
        );

        setIsEditing(false);
    };


    /*
     * Cancel editing
     */

    const handleCancelEdit = () => {
        setEditContent(message.content);
        setIsEditing(false);
    };


    return (
        <div
            className={`rtc-message ${
                isMine
                    ? "rtc-mine"
                    : "rtc-other"
            }`}
        >

            {/* Sender name */}

            {!isMine && (
                <div className="rtc-sender">
                    {message.senderId}
                </div>
            )}


            <div className="rtc-bubble">

                {/* Deleted message */}

                {message.isDeleted ? (
                    <>
                        <div className="rtc-deleted-message">
                            Message deleted
                        </div>

                        <span className="rtc-message-time">
                            {time}
                        </span>
                    </>
                ) : isEditing ? (

                    /* Edit mode */

                    <div className="rtc-message-edit">

                        <input
                            value={editContent}
                            onChange={(e) =>
                                setEditContent(
                                    e.target.value
                                )
                            }
                            autoFocus
                            onKeyDown={(e) => {
                                if (
                                    e.key ===
                                    "Enter"
                                ) {
                                    handleSaveEdit();
                                }

                                if (
                                    e.key ===
                                    "Escape"
                                ) {
                                    handleCancelEdit();
                                }
                            }}
                        />

                        <div className="rtc-message-actions">

                            <button
                                type="button"
                                onClick={
                                    handleSaveEdit
                                }
                            >
                                Save
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleCancelEdit
                                }
                            >
                                Cancel
                            </button>

                        </div>

                    </div>

                ) : (

                    /* Normal message */

                    <>
                        {message.messageType === "file" ? 
                        (

                            message.attachment?.fileType?.startsWith("image/") ? (

                                <div className="rtc-image-message">

                                    <a
                                        href={message.attachment.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <img
                                            src={message.attachment.fileUrl}
                                            alt={message.attachment.fileName}
                                            className="rtc-image-preview"
                                        />
                                    </a>

                                    <div className="rtc-image-name">
                                        {message.attachment.fileName}
                                    </div>

                                </div>

                            ) : (

                                <div className="rtc-file-message">

                                    <div className="rtc-file-info">

                                        <span className="rtc-file-icon">
                                            {getFileIcon(
                                                message.attachment?.fileType
                                            )}
                                        </span>

                                        <div className="rtc-file-details">

                                            <div className="rtc-file-name">
                                                {message.attachment?.fileName}
                                            </div>

                                            <div className="rtc-file-size">
                                                {formatFileSize(
                                                    message.attachment?.fileSize
                                                )}
                                            </div>

                                        </div>

                                    </div>

                                    <div className="rtc-file-actions">

                                        <a
                                            href={message.attachment?.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rtc-file-open"
                                            aria-label="Open file"
                                            title="Open file"
                                        >
                                                ↗
                                        </a>

                                        <a
                                            href={message.attachment?.fileUrl}
                                            download={message.attachment?.fileName}
                                            className="rtc-file-download"
                                            aria-label="Download file"
                                            title="Download file"
                                        >
                                            ↓
                                        </a>

                                    </div>

                                </div>

                            )

                        ) : (
                            <div>
                                {message.content}
                            </div>
                        )}

                        <span className="rtc-message-time">
                            {time}
                        </span>

                        {isMine && (
                            <div className="rtc-message-actions">

                                {message.messageType !== "file" && (
                                    <button
                                        type="button"
                                        className="rtc-edit-button"
                                        onClick={handleEdit}
                                        aria-label="Edit message"
                                        title="Edit message"
                                    >
                                        ✎
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="rtc-delete-button"
                                    onClick={() =>
                                        onDeleteMessage(message._id)
                                    }
                                    aria-label="Delete message"
                                    title="Delete message"
                                >
                                    🗑
                                </button>

                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default MessageItem;