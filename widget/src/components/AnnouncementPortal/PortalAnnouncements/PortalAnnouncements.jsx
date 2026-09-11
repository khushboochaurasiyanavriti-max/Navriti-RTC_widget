import AnnouncementList
    from "../AnnouncementList/AnnouncementList.jsx";

function PortalAnnouncements({
    announcements,
    selectedPortal,
    loading,
    onDelete,
    onEdit,
    userId,
    platformId,
}) {
    console.log("portal announcments enetered: ",platformId);
    return (
        <AnnouncementList
            announcements={announcements}
            selectedPortal={selectedPortal}
            loading={loading}
            onDelete={onDelete}
            onEdit={onEdit}
            userId={userId}
            platformId={platformId}
        />
    );
}

export default PortalAnnouncements;
