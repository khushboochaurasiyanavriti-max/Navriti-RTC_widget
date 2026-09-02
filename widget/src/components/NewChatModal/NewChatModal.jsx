import { useEffect, useState } from "react";
import "./NewChatModal.css";

function NewChatModal({
    currentUser,
    users = [],
    isOpen,
    onClose,
    onStartChat,
}) {
    const [selectedUser, setSelectedUser] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [isStarting, setIsStarting] =
        useState(false);


    /*
     * Reset modal state whenever it closes
     */

    useEffect(() => {
        if (!isOpen) {
            setSelectedUser("");
            setSearch("");
            setIsStarting(false);
        }
    }, [isOpen]);


    if (!isOpen) {
        return null;
    }


    /*
     * Filter users
     */

    const filteredUsers = users.filter(
        (user) =>
            user.userId !== currentUser &&
            user.displayName
                ?.toLowerCase()
                .includes(
                    search.toLowerCase()
                )
    );


    /*
     * Start chat
     */

    const handleStartChat = async () => {
        if (!selectedUser || isStarting) {
            return;
        }

        try {
            setIsStarting(true);

            await onStartChat(selectedUser);

            setSelectedUser("");
            setSearch("");

        } catch (error) {
            console.error(
                "Failed to start chat:",
                error
            );
        } finally {
            setIsStarting(false);
        }
    };


    /*
     * Cancel
     */

    const handleCancel = () => {
        setSelectedUser("");
        setSearch("");

        onClose();
    };


    return (
        <div
            className="rtc-modal-overlay"
            onClick={handleCancel}
        >
            <div
                className="rtc-modal"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >

                <h2>💬 New Chat</h2>


                {/* Search */}

                <input
                    className="rtc-user-search"
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                    autoFocus
                />


                {/* Users */}

                <div className="rtc-user-list">

                    {filteredUsers.length === 0 ? (
                        <div className="rtc-no-users">
                            No users found
                        </div>
                    ) : (
                        filteredUsers.map(
                            (user) => (
                                <button
                                    key={
                                        user.userId
                                    }
                                    type="button"
                                    className={`rtc-user-item ${
                                        selectedUser ===
                                        user.userId
                                            ? "rtc-selected-user"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        setSelectedUser(
                                            user.userId
                                        )
                                    }
                                >

                                    <div className="rtc-user-avatar">
                                        {user.displayName
                                            ?.charAt(
                                                0
                                            )
                                            .toUpperCase() ||
                                            "?"}
                                    </div>

                                    <div>
                                        {
                                            user.displayName
                                        }
                                    </div>

                                </button>
                            )
                        )
                    )}

                </div>


                {/* Actions */}

                <div className="rtc-modal-buttons">

                    <button
                        type="button"
                        className="rtc-cancel-btn"
                        onClick={handleCancel}
                        disabled={isStarting}
                    >
                        Cancel
                    </button>


                    <button
                        type="button"
                        className="rtc-primary-btn"
                        disabled={
                            !selectedUser ||
                            isStarting
                        }
                        onClick={
                            handleStartChat
                        }
                    >
                        {isStarting
                            ? "Starting..."
                            : "Start Chat"}
                    </button>

                </div>

            </div>
        </div>
    );
}

export default NewChatModal;