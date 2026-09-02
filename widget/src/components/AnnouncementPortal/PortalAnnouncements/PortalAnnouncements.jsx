import AnnouncementList
    from "../AnnouncementList/AnnouncementList.jsx";

function PortalAnnouncements({
    announcements,
    selectedPortal,
    loading,
    onDelete,
    onEdit,
}) {
    return (
        <AnnouncementList
            announcements={announcements}
            selectedPortal={selectedPortal}
            loading={loading}
            onDelete={onDelete}
            onEdit={onEdit}
        />
    );
}

export default PortalAnnouncements;
