import { getApi } from "./api";


/*
 * ---------------------------------------------------------
 * Get all announcement portals
 * available to current user.
 * ---------------------------------------------------------
 */

export const getUserAnnouncementPortals = async (
    userId
) => {

    const api = getApi();

    const response = await api.get(
        "/announcement-portals",
        {
            params: {
                userId,
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
    userId
) => {

    const api = getApi();

    const response = await api.get(
        `/announcement-portals/${portalId}/announcements`,
        {
            params: {
                userId,
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
    userId
) => {

    const api = getApi();

    const response = await api.get(
        `/announcement-portals/${portalId}/announcements/${announcementId}`,
        {
            params: {
                userId,
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
    formData
) => {

    const api = getApi();

    const response = await api.post(
        `/announcement-portals/${portalId}/announcements`,
        formData,
        
    );

    return response.data.announcement;
};


/*
 * ---------------------------------------------------------
 * Update announcement
 * ---------------------------------------------------------
 */

export const updateAnnouncement = async (
    portalId,
    announcementId,
    data
) => {

    const api = getApi();

    const response = await api.patch(
        `/announcement-portals/${portalId}/announcements/${announcementId}`,
        data
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
    userId
) => {

    const api = getApi();

    const response = await api.delete(
        `/announcement-portals/${portalId}/announcements/${announcementId}`,
        {
            params: {
                userId,
            },
        }
    );

    return response.data;
};

export const getAnnouncementPortalMembers = async (
    portalId,
    userId
) => {

    const api = getApi();

    const response = await api.get(
        `/announcement-portals/${portalId}/members`,
        {
            params: {
                userId,
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
    hostUserId
) => {

    const api = getApi();

    const response = await api.post(
        `/announcement-portals/${portalId}/members`,
        {
            members,
            hostUserId,
        }
    );

    return response.data;
};

export const removePortalMember = async (
    portalId,
    userId,
    hostUserId
) => {
    const api = getApi();

    const response = await api.delete(
        `/announcement-portals/${portalId}/members/${userId}`,
        {
            data: {
                hostUserId,
            },
        }
    );

    return response.data;
};


export const updatePortalMemberRole = async (
    portalId,
    userId,
    hostUserId,
    role
) => {

    const api = getApi();

    const response = await api.patch(
        `/announcement-portals/${portalId}/members/${userId}/role`,
        {
            hostUserId,
            role,
        }
    );

    return response.data;
};
export const deleteAnnouncementPortal = async (
    portalId,
    userId
) => {

    const api = getApi();

    const response = await api.delete(
        `/announcement-portals/${portalId}`,
        {
            data: {
                userId,
            },
        }
    );

    return response.data;
};


