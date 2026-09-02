import { useState } from "react";
import "./ChatInput.css";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
    // Images
    "image/jpeg",
    "image/png",
    "image/webp",

    // Documents
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    // Excel
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    // ZIP
    "application/zip",
    "application/x-zip-compressed",
];


function ChatInput({
    message,
    setMessage,
    sendMessage,
    users = [],
    currentUser,
    selectedConversation,
    serverUrl,
}) {
    const [showMentions, setShowMentions] =
        useState(false);

    const [mentionText, setMentionText] =
        useState("");

    const [isUploading, setIsUploading] =
        useState(false);


    /*
     * --------------------------------------------
     * Handle typing
     * --------------------------------------------
     */

    const handleChange = (e) => {
        const value = e.target.value;

        setMessage(value);

        const currentWord =
            value.split(/\s/).pop() || "";

        if (currentWord.startsWith("@")) {
            const searchText =
                currentWord
                    .slice(1)
                    .toLowerCase();

            setMentionText(searchText);
            setShowMentions(true);
        } else {
            setMentionText("");
            setShowMentions(false);
        }
    };


    /*
     * --------------------------------------------
     * Handle file select
     * --------------------------------------------
     */

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];

        if (!file) {
            return;
        }

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            alert(
                "File type not supported. Please upload an image, PDF, Word, Excel, TXT, or ZIP file."
            );

            e.target.value = "";
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            alert("File size cannot exceed 20 MB.");

            e.target.value = "";
            return;
        }

        try {
            setIsUploading(true);

            const formData = new FormData();

            formData.append("file", file);

            const response = await fetch(
                `${serverUrl}/api/files/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "File upload failed"
                );
            }

            const attachment = {
                fileName:
                    data.file.originalName,

                fileUrl:
                    data.file.fileUrl,

                fileType:
                    data.file.fileType,

                fileSize:
                    data.file.fileSize,

                publicId:
                    data.file.publicId,

                resourceType:
                    data.file.resourceType,
            };

            try {
                await sendMessage({
                    messageType: "file",
                    content: "",
                    attachment,
                });

            } catch (sendError) {

                await fetch(
                    `${serverUrl}/api/files/upload`,
                    {
                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            publicId:
                                attachment.publicId,

                            resourceType:
                                attachment.resourceType,
                        }),
                    }
                ).catch((cleanupError) => {
                    console.error(
                        "Uploaded file cleanup error:",
                        cleanupError
                    );
                });

                throw sendError;
            }

        } catch (error) {

            console.error(
                "File upload error:",
                error
            );

            alert(
                error.message ||
                "File upload failed"
            );

        } finally {

            setIsUploading(false);

            e.target.value = "";
        }
    };


    /*
     * --------------------------------------------
     * Filter users for mention
     *
     * Backend participants are now:
     *
     * {
     *     userId,
     *     displayName
     * }
     *
     * So we compare participant.userId.
     * --------------------------------------------
     */

    const participantIds =
        selectedConversation?.participants || [];


    const filteredUsers = users

        // Only users belonging to this conversation
        .filter((user) =>
            participantIds.some(
                (participantId) =>
                    participantId?.toString() ===
                    user.userId?.toString()
            )
        )

        // Don't show current user
        .filter(
            (user) =>
                user.userId?.toString() !==
                currentUser?.userId?.toString()
        )

        // Match display name
        .filter((user) =>
            user.displayName
                ?.toLowerCase()
                .includes(mentionText)
        );
        console.log("MENTION DEBUG", {
            selectedConversation,
            participantIds,
            users,
            filteredUsers,
        });


    /*
     * --------------------------------------------
     * Select mention
     * --------------------------------------------
     */

    const handleMentionSelect = (user) => {
        const words =
            message.split(/\s/);

        words[words.length - 1] =
            `@${user.displayName}`;

        setMessage(
            words.join(" ") + " "
        );

        setShowMentions(false);
        setMentionText("");
    };


    /*
     * --------------------------------------------
     * Send message
     * --------------------------------------------
     */

    const handleSend = () => {
        if (!message.trim()) {
            return;
        }

        sendMessage();

        setShowMentions(false);
        setMentionText("");
    };


    /*
     * --------------------------------------------
     * Keyboard handling
     * --------------------------------------------
     */

    const handleKeyDown = (e) => {

        if (e.key === "Enter") {
            e.preventDefault();

            handleSend();

            return;
        }

        if (e.key === "Escape") {
            setShowMentions(false);
            setMentionText("");
        }
    };


    return (
        <div className="rtc-chat-input-container">

            {/* Mention suggestions */}

            {showMentions &&
                filteredUsers.length > 0 && (

                    <div className="rtc-mention-list">

                        {filteredUsers.map((user) => (

                            <button
                                key={user.userId}
                                type="button"
                                className="rtc-mention-item"
                                onClick={() =>
                                    handleMentionSelect(
                                        user
                                    )
                                }
                            >
                                @{user.displayName}
                            </button>

                        ))}

                    </div>
                )}


            {/* File Input */}

            <input
                type="file"
                id="rtc-file-input"
                hidden
                onChange={handleFileSelect}
            />


            <label
                htmlFor="rtc-file-input"
                className={`rtc-file-button ${
                    isUploading
                        ? "rtc-file-button-disabled"
                        : ""
                }`}
                title={
                    isUploading
                        ? "Uploading..."
                        : "Attach file"
                }
            >
                {isUploading ? "⏳" : "📎"}
            </label>


            {/* Text Input */}

            <input
                className="rtc-chat-input"
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />


            {/* Send */}

            <button
                type="button"
                className="rtc-send-button"
                onClick={handleSend}
                disabled={
                    !message.trim() ||
                    isUploading
                }
                aria-label="Send message"
            >
                {isUploading ? "..." : "➤"}
            </button>

        </div>
    );
}

export default ChatInput;