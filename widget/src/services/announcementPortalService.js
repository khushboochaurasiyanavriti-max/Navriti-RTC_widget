import { getApi } from "./api";


/*
 * ---------------------------------------------------------
 * Get all announcement portals
 * available to current user.
 * ---------------------------------------------------------
 */

export const getUserAnnouncementPortals = async (
    userId,
    platformId,
) => {

    const api = getApi();

    const response = await api.get(
        "/announcement-portals",
        {
            params: {
                userId,
                platformId,
            },
        }
    );

    return response.data || [];
};


/*
 * ---------------------------------------------------------
 * Create announcement portal
 * ---------------------------------------------------------
 */

export const createAnnouncementPortal = async ({
    platformId,
    name,
    description,
    userId,
    role,
    targetAudience,
    members,
}) => {

    const api = getApi();

    const response = await api.post(
        "/announcement-portals",
        {
            platformId,
            name,
            description,
            userId,
            role,
            targetAudience,
            members,
        }
    );

    return (
        response.data.portal ||
        response.data
    );
};


/*
 * ---------------------------------------------------------
 * Get announcements
 * ---------------------------------------------------------
 */

export const getAnnouncements = async (
    portalId,
    userId,
    platformId,
) => {

    const api = getApi();

    const response = await api.get(
        `/announcement-portals/${portalId}/announcements`,
        {
            params: {
                userId,
                platformId,
            },
        }
    );

    return response.data.announcements || [];
};


/*
 * ---------------------------------------------------------
 * Get single announcement
 * ---------------------------------------------------------
 */

export const getAnnouncement = async (
    portalId,
    announcementId,
    userId,
    platformId,
) => {

    const api = getApi();

    const response = await api.get(
        `/announcement-portals/${portalId}/announcements/${announcementId}`,
        {
            params: {
                userId,
                platformId,
            },
        }
    );

    return response.data.announcement;
};


/*
 * ---------------------------------------------------------
 * Create announcement
 * ---------------------------------------------------------
 */

export const createAnnouncement = async (
    portalId,
    formData,
    platformId,
) =>{
    formData.append?.("platformId",platformId); 
    if(!formData.append) 
        formData={...formData,platformId}; 
    return (
        await getApi().post(
            `/announcement-portals/${portalId}/announcements?platformId=${encodeURIComponent(platformId)}`,
            formData)).data.announcement;
};


/*
 * ---------------------------------------------------------
 * Update announcement
 * ---------------------------------------------------------
 */

export const updateAnnouncement = async (
    portalId,
    announcementId,
    data,
    platformId,
) => {

    const api = getApi();

    const response = await api.patch(
        `/announcement-portals/${portalId}/announcements/${announcementId}`,
        {
            ...data,
            platformId,
        }
    );

    return response.data.announcement;
};


/*
 * ---------------------------------------------------------
 * Delete announcement
 * ---------------------------------------------------------
 */

export const deleteAnnouncement = async (
    portalId,
    announcementId,
    userId,
    platformId,
) => {

    const api = getApi();

    const response = await api.delete(
        `/announcement-portals/${portalId}/announcements/${announcementId}`,
        {
            params: {
                userId,
                platformId,
            },
            data: {
                userId,
                platformId,
            },
        }
    );

    return response.data;
};

export const getAnnouncementPortalMembers = async (
    portalId,
    userId,
    platformId,
) => {

    const api = getApi();

    const response = await api.get(
        `/announcement-portals/${portalId}/members`,
        {
            params: {
                userId,
                platformId,
            },
        }
    );

    return response.data.members || [];
};

/* 
 * ---------------------------------------------------------
 * Add members to announcement portal
 * ---------------------------------------------------------
 */

export const addPortalMembers = async (
    portalId,
    members,
    hostUserId,
    platformId,
) => {

    const api = getApi();

    const response = await api.post(
        `/announcement-portals/${portalId}/members`,
        {
            members,
            hostUserId,
            platformId,
        }
    );

    return response.data;
};

export const removePortalMember = async (
    portalId,
    userId,
    hostUserId,
    platformId,
) => {
    const api = getApi();

    const response = await api.delete(
        `/announcement-portals/${portalId}/members/${userId}`,
        {
            params: {
                hostUserId,
                platformId,
            },
            data: {
                hostUserId,
                platformId,
            },
        }
    );

    return response.data;
};


export const updatePortalMemberRole = async (
    portalId,
    userId,
    hostUserId,
    role,
    platformId,
) => {

    const api = getApi();

    const response = await api.patch(
        `/announcement-portals/${portalId}/members/${userId}/role`,
        {
            hostUserId,
            role,
            platformId,
        }
    );

    return response.data;
};
export const deleteAnnouncementPortal = async (
    portalId,
    userId,
    platformId,
) => {

    const api = getApi();

    const response = await api.delete(
        `/announcement-portals/${portalId}`,
        {
            params: {
                userId,
                platformId,
            },
            data: {
                userId,
                platformId,
            },
        }
    );

    return response.data;
};



/* 
 * ---------------------------------------------------------
 * Download Announcement Attachment
 * ---------------------------------------------------------
 *
 * Attachment Cloudinary se directly nahi khulega because
 * the stored file is encrypted.
 *
 * Backend fetches + decrypts the file and returns the
 * original file as a blob.
 * ---------------------------------------------------------
 */

export const downloadAnnouncementAttachment = async ({
    publicId,
    userId,
    platformId,
    fileType,
    fileName,
    resourceType,
}) => {

    const api = getApi();

    const response = await api.get(
        "/files/download",
        {
            params: {
                publicId,
                userId,
                platformId,
                fileType,
                fileName,
                resourceType,
                entity: "announcement-file",
            },
            responseType: "blob",
        }
    );

    return response.data;
};