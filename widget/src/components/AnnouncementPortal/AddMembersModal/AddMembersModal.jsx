function AddMembersModal({
    isOpen,
    users = [],
    selectedUsers = [],
    loading = false,
    onToggle,
    onClose,
    onAdd,
}) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="announcement-add-member-overlay">

            <div className="announcement-add-member-modal">

                <div className="announcement-add-member-header">

                    <div>
                        <h3>
                            Add Members
                        </h3>

                        <p>
                            Select users to add to this portal.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close add members"
                    >
                        ×
                    </button>

                </div>


                <div className="announcement-add-member-list">

                    {users.length === 0 ? (

                        <p className="announcement-add-member-empty">
                            No users available to add.
                        </p>

                    ) : (

                        users.map((user) => {

                            const isSelected =
                                selectedUsers.includes(
                                    user.userId
                                );

                            return (
                                <label
                                    key={user.userId}
                                    className={`announcement-add-member-item ${
                                        isSelected
                                            ? "selected"
                                            : ""
                                    }`}
                                >

                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() =>
                                            onToggle(
                                                user.userId
                                            )
                                        }
                                        disabled={loading}
                                    />

                                    <span>
                                        {
                                            user.displayName ||
                                            user.userId
                                        }
                                    </span>

                                </label>
                            );
                        })

                    )}

                </div>


                <div className="announcement-add-member-actions">

                    <button
                        type="button"
                        className="announcement-add-member-cancel"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>


                    <button
                        type="button"
                        className="announcement-add-member-confirm"
                        onClick={onAdd}
                        disabled={
                            loading ||
                            selectedUsers.length === 0
                        }
                    >
                        {loading
                            ? "Adding..."
                            : `Add ${selectedUsers.length} Member${
                                selectedUsers.length !== 1
                                    ? "s"
                                    : ""
                            }`
                        }
                    </button>

                </div>

            </div>

        </div>
    );
}

export default AddMembersModal;
