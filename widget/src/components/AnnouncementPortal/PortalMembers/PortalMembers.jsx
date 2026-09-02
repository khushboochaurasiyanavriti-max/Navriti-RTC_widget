import AddMembersModal
    from "../AddMembersModal/AddMembersModal.jsx";

function PortalMembers({
    members = [],
    users = [],
    currentUserId,
    portal,
    loading,
    show,
    showAddMember,
    availableMembers = [],
    selectedNewMembers = [],
    addingMembers,
    onClose,
    onRoleChange,
    onRemove,
    onToggleNewMember,
    onAddMembers,
    onCloseAddMember,
}) {
    if (!show) {
        return null;
    }

    return (
        <div className="announcement-portal-members">

            <div className="announcement-portal-members-header">

                <div className="announcement-portal-members-title">

                    <h3>
                        Members
                    </h3>

                    <span className="announcement-portal-member-count">
                        {members.length}
                    </span>

                </div>


                <button
                    type="button"
                    className="announcement-portal-members-close"
                    onClick={onClose}
                    aria-label="Close members"
                >
                    ×
                </button>

            </div>


            <AddMembersModal
                isOpen={showAddMember}
                users={availableMembers}
                selectedUsers={selectedNewMembers}
                loading={addingMembers}
                onToggle={onToggleNewMember}
                onClose={onCloseAddMember}
                onAdd={onAddMembers}
            />


            <div className="announcement-portal-member-list">

                {loading ? (

                    <p>
                        Loading members...
                    </p>

                ) : members.length === 0 ? (

                    <p>
                        No members found.
                    </p>

                ) : (

                    members.map((member) => {

                        const isHost =
                            member.userId ===
                            portal.createdBy;

                        const canRemove =
                            portal.role === "host" &&
                            !isHost;

                        const memberUser =
                            users.find(
                                (user) =>
                                    user.userId ===
                                    member.userId
                            );

                        const displayName =
                            memberUser?.displayName ||
                            member.userId;

                        const canChangeRole =
                            portal.role === "host" &&
                            member.userId !==
                                portal.createdBy &&
                            member.userId !==
                                currentUserId;

                        return (
                            <div
                                key={
                                    member._id ||
                                    member.userId
                                }
                                className="announcement-portal-member"
                            >

                                <div className="announcement-member-info">

                                    <strong>
                                        {displayName}
                                    </strong>

                                </div>


                                <div className="announcement-member-actions">

                                    {canChangeRole ? (

                                        <select
                                            className="announcement-member-role-select"
                                            value={member.role}
                                            onChange={(event) =>
                                                onRoleChange(
                                                    member.userId,
                                                    event.target.value
                                                )
                                            }
                                        >
                                            <option value="participant">
                                                Participant
                                            </option>

                                            <option value="host">
                                                Host
                                            </option>

                                        </select>

                                    ) : (

                                        <span
                                            className={`announcement-member-role ${member.role}`}
                                        >
                                            {member.role}
                                        </span>

                                    )}


                                    {canRemove && (
                                        <button
                                            type="button"
                                            className="announcement-member-remove"
                                            onClick={() =>
                                                onRemove(
                                                    member
                                                )
                                            }
                                        >
                                            Remove
                                        </button>
                                    )}

                                </div>

                            </div>
                        );
                    })

                )}

            </div>

        </div>
    );
}

export default PortalMembers;
