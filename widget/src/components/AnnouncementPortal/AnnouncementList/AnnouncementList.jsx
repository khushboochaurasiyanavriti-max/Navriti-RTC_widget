import AnnouncementCard
    from "../AnnouncementCard/AnnouncementCard";

import "./AnnouncementList.css";

function AnnouncementList({
    announcements,
    selectedPortal,
    loading,
    onDelete,
    onEdit,
}) {

    if (loading) {
        return (
            <div className="announcement-list-loading">
                Loading announcements...
            </div>
        );
    }


    if (!announcements.length) {
        return (
            <div className="announcement-list-empty">

                <div className="announcement-list-empty-icon">
                    📭
                </div>

                <h3>
                    No announcements
                </h3>

                <p>
                    There are no active announcements
                    in this portal.
                </p>

            </div>
        );
    }


    const canManage =
        selectedPortal?.role === "host" ||
        selectedPortal?.role === "admin";


    return (
        <div className="announcement-list">

            {announcements.map(
                (announcement) => (

                    <AnnouncementCard
                        key={
                            announcement._id
                        }
                        announcement={
                            announcement
                        }
                        canManage={
                            canManage
                        }
                        onDelete={
                            onDelete
                        }
                        onEdit={onEdit}
                    />

                )
            )}

        </div>
    );
}

export default AnnouncementList;