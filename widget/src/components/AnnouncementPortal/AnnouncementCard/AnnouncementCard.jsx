import AnnouncementAttachments
    from "../AnnouncementAttachments/AnnouncementAttachments";

import "./AnnouncementCard.css";

const formatDate = (date) => {
    if (!date) {
        return "";
    }

    return new Date(date).toLocaleString();
};


function AnnouncementCard({
    announcement,
    canManage,
    onDelete,
    onEdit,
}) {

    const handleDelete = () => {

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this announcement?"
            );

        if (!confirmed) {
            return;
        }

        onDelete(
            announcement._id
        );
    };


    return (
        <div className="announcement-card-shell">

            <div className="announcement-author">

                <span>
                    By {announcement.senderId}
                </span>

                <time>
                    {formatDate(announcement.publishedAt)}
                </time>

            </div>

            <article className="announcement-card">

            {/* =================================
                Header
            ================================== */}

            <div className="announcement-card-header">

                <div className="announcement-card-heading">

                    <h3>
                        {announcement.title}
                    </h3>

                </div>


            {/* Edit & Delete */}

            {canManage && (
                <div className="announcement-card-actions">

                    <button
                        type="button"
                        className="announcement-edit-button"
                        onClick={() =>
                            onEdit(announcement)
                        }
                        aria-label="Edit announcement"
                        title="Edit announcement"
                    >
                        ✎
                    </button>

                    <button
                        type="button"
                        className="announcement-delete-button"
                        onClick={handleDelete}
                        aria-label="Delete announcement"
                        title="Delete announcement"
                    >
                        🗑
                    </button>

                </div>
            )}

            </div>


            {/* =================================
                Content
            ================================== */}

            <div className="announcement-card-content">

                {announcement.content}

            </div>


            {/* =================================
                Audience
            ================================== */}

            <div className="announcement-audience">

                    <span className="announcement-audience-label">
                    {announcement.targetAudience === "all"
                        ? "Everyone"
                        : "Specific users"}
                </span>

            </div>


            {/* =================================
                Attachments
            ================================== */}

            <AnnouncementAttachments
                attachments={
                    announcement.attachments
                }
            />

            </article>

        </div>
    );
}

export default AnnouncementCard;