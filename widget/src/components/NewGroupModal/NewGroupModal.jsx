import { useEffect, useState } from "react";
import "./NewGroupModal.css";

function NewGroupModal({
    currentUser,
    users = [],
    isOpen,
    onClose,
    onCreateGroup,
}) {
    const [groupName, setGroupName] = useState("");
    const [search, setSearch] = useState("");
    const [selectedUsers, setSelectedUsers] =
        useState([]);

    const [isCreating, setIsCreating] =
        useState(false);


    /*
     * Reset state whenever modal closes
     */

    useEffect(() => {
        if (!isOpen) {
            setGroupName("");
            setSearch("");
            setSelectedUsers([]);
            setIsCreating(false);
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
     * Select / deselect user
     */

    const toggleUser = (userId) => {
        setSelectedUsers((prev) => {
            if (prev.includes(userId)) {
                return prev.filter(
                    (id) => id !== userId
                );
            }

            return [...prev, userId];
        });
    };


    /*
     * Cancel
     */

    const handleCancel = () => {
        setGroupName("");
        setSearch("");
        setSelectedUsers([]);

        onClose();
    };


    /*
     * Create group
     */

    const handleCreateGroup = async () => {
        const trimmedGroupName =
            groupName.trim();

        if (
            !trimmedGroupName ||
            selectedUsers.length === 0 ||
            isCreating
        ) {
            return;
        }

        try {
            setIsCreating(true);

            await onCreateGroup(
                trimmedGroupName,
                selectedUsers
            );

            setGroupName("");
            setSearch("");
            setSelectedUsers([]);

        } catch (error) {
            console.error(
                "Failed to create group:",
                error
            );
        } finally {
            setIsCreating(false);
        }
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

                {/* Header */}

                <div className="rtc-modal-header">
                    <h2>
                        👥 Create Group
                    </h2>
                </div>


                {/* Group name */}

                <input
                    className="rtc-group-name-input"
                    type="text"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) =>
                        setGroupName(
                            e.target.value
                        )
                    }
                    maxLength={100}
                    autoFocus
                />


                {/* Search members */}

                <input
                    className="rtc-user-search"
                    type="text"
                    placeholder="Search members..."
                    value={search}
                    onChange={(e) =>
                        setSearch(
                            e.target.value
                        )
                    }
                />


                {/* Selected members */}

                {selectedUsers.length > 0 && (
                    <div className="rtc-selected-members">

                        {selectedUsers.map((id) => {
                            const user =
                                users.find(
                                    (u) =>
                                        u.userId ===
                                        id
                                );

                            if (!user) {
                                return null;
                            }

                            return (
                                <div
                                    key={id}
                                    className="rtc-member-chip"
                                >
                                    <span>
                                        {
                                            user.displayName
                                        }
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleUser(
                                                id
                                            )
                                        }
                                        disabled={
                                            isCreating
                                        }
                                        aria-label={`Remove ${user.displayName}`}
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}

                    </div>
                )}


                {/* User list */}

                <div className="rtc-user-list">

                    {filteredUsers.length === 0 ? (
                        <div className="rtc-no-users">
                            No users found
                        </div>
                    ) : (
                        filteredUsers.map(
                            (user) => {
                                const isSelected =
                                    selectedUsers.includes(
                                        user.userId
                                    );

                                return (
                                    <button
                                        key={
                                            user.userId
                                        }
                                        type="button"
                                        className={`rtc-user-item ${
                                            isSelected
                                                ? "rtc-selected-user"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            toggleUser(
                                                user.userId
                                            )
                                        }
                                        disabled={
                                            isCreating
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

                                        <div className="rtc-user-name">
                                            {
                                                user.displayName
                                            }
                                        </div>

                                        {isSelected && (
                                            <span className="rtc-check">
                                                ✓
                                            </span>
                                        )}

                                    </button>
                                );
                            }
                        )
                    )}

                </div>


                {/* Actions */}

                <div className="rtc-modal-buttons">

                    <button
                        type="button"
                        className="rtc-cancel-btn"
                        onClick={handleCancel}
                        disabled={isCreating}
                    >
                        Cancel
                    </button>


                    <button
                        type="button"
                        className="rtc-primary-btn"
                        disabled={
                            !groupName.trim() ||
                            selectedUsers.length ===
                                0 ||
                            isCreating
                        }
                        onClick={
                            handleCreateGroup
                        }
                    >
                        {isCreating
                            ? "Creating..."
                            : "Create Group"}
                    </button>

                </div>

            </div>
        </div>
    );
}

export default NewGroupModal;