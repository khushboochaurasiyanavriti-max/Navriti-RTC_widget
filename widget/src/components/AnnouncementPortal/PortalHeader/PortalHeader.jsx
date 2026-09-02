function PortalHeader({
    portal,
    memberCount = 0,
    showMembers,
    showPortalMenu,
    canManage,
    onCreateAnnouncement,
    onToggleMenu,
    onToggleMembers,
    onAddMembers,
    onDeletePortal,
    onClose,
}) {
    if (!portal) {
        return null;
    }

    return (
        <div className="announcement-content-header">

            <div>

                <div className="announcement-selected-portal-title-row">

                    <h3>
                        {portal.name}
                    </h3>

                    <span
                        className={`announcement-role-badge ${portal.role}`}
                    >
                        {portal.role}
                    </span>

                </div>

                {portal.description && (
                    <p>
                        {portal.description}
                    </p>
                )}

            </div>


            <div className="announcement-content-header-actions">

                {canManage && (
                    <button
                        type="button"
                        className="announcement-create-button"
                        onClick={onCreateAnnouncement}
                    >
                        + Announcement
                    </button>
                )}

                <button
                    type="button"
                    className="announcement-back-button"
                    onClick={onClose}
                    aria-label="Close portal"
                    title="Close portal"
                >
                    ×
                </button>


                <div className="announcement-portal-menu">

                    <button
                        type="button"
                        className="announcement-portal-menu-button"
                        onClick={onToggleMenu}
                        aria-label="Portal options"
                    >
                        ⋮
                    </button>


                    {showPortalMenu && (
                        <div className="announcement-portal-menu-dropdown">

                            <button
                                type="button"
                                onClick={onToggleMembers}
                            >
                                <span>
                                    {showMembers
                                        ? "Hide Members"
                                        : "Members"}
                                </span>

                                <span>
                                    {memberCount}
                                </span>
                            </button>


                            {canManage && (
                                <button
                                    type="button"
                                    onClick={onAddMembers}
                                >
                                    + Add Members
                                </button>
                            )}


                            {canManage && (
                                <button
                                    type="button"
                                    className="announcement-portal-menu-danger"
                                    onClick={onDeletePortal}
                                >
                                    Delete Portal
                                </button>
                            )}

                        </div>
                    )}

                </div>

            </div>

        </div>
    );
}

export default PortalHeader;
