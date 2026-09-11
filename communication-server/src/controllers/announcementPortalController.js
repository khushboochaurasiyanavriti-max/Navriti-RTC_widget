import cloudinary from "../config/cloudinary.js";
import crypto from "crypto";
import { userRoom, announcementRoom } from "../socket/socketHandler.js";

import {
    createPortal,
    getPortalById,
    deletePortal,

    addMember,
    addMembers,
    getMember,
    getMembersByPortal,
    getPortalsByUser,
    updateMemberRole,
    removeMember,

    createAnnouncement as createAnnouncementCassandra,
    getAnnouncementById,
    getAnnouncementsByPortal,
    updateAnnouncement as updateAnnouncementCassandra,
    deleteAnnouncement as deleteAnnouncementCassandra,
} from "../repositories/announcementRepository.js";

import {
    encryptFile,
    decryptFile,
} from "../service/fileEncryptionService.js";

let io = null;

export const setAnnouncementSocket = (socketIo) => {
    io = socketIo;
};


/* =====================================================
   CREATE ANNOUNCEMENT PORTAL
===================================================== */

const createAnnouncementPortal = async (req, res) => {
    try {
        const {
            userId,
            role,
            name,
            description,
            targetAudience = "all",
            members = [],
            platformId,
        } = req.body || {};

        console.log(
            "CREATE PORTAL BODY:",
            req.body
        );

        if (!userId || !platformId) {
            return res.status(400).json({
                message: "userId is required",
            });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Portal name is required",
            });
        }

        if (role !== "admin") {
            return res.status(403).json({
                message:
                    "Only admins can create announcement portals",
            });
        }

        if (
            !["all", "selected"].includes(
                targetAudience
            )
        ) {
            return res.status(400).json({
                message: "Invalid targetAudience",
            });
        }

        if (
            targetAudience === "selected" &&
            (
                !Array.isArray(members) ||
                members.length === 0
            )
        ) {
            return res.status(400).json({
                message:
                    "At least one member is required for a selected portal",
            });
        }

        const portalId =
            crypto.randomBytes(12).toString("hex");

        const portal = await createPortal({
            portalId,
            name: name.trim(),
            description:
                description?.trim() || "",
            createdBy: userId,
            targetAudience,
            platformId,
        });

        const membership = await addMember({
            portalId,
            platformId,
            userId,
            role: "host",
            addedBy: userId,
        });

        let participantMembers = [];

        if (Array.isArray(members)) {
            participantMembers = members
                .filter(
                    (member) =>
                        member?.userId
                )
                .filter(
                    (member) =>
                        member.userId !== userId
                )
                .map((member) => ({
                    portalId,
                    platformId,
                    userId: member.userId,
                    role: "participant",
                    addedBy: userId,
                }));
        }

        let createdMembers = [];

        if (participantMembers.length > 0) {
            createdMembers =
                await addMembers(
                    participantMembers
                );
        }

        if (io) {
            const memberIds = [
                userId,
                ...createdMembers.map(
                    (member) =>
                        member.userId
                ),
            ];

            memberIds.forEach((memberId) => {
                io.to(
                    userRoom(platformId, memberId)
                ).emit(
                    "announcement:portal-created",
                    {
                        portalId,
                        portal,
                    }
                );
            });
        }

        return res.status(201).json({
            message:
                "Announcement portal created successfully",

            portal,

            membership,

            members: createdMembers,
        });

    } catch (error) {
        console.error(
            "Create announcement portal error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to create announcement portal",
            error: error.message,
        });
    }
};


/* =====================================================
   ADD PORTAL MEMBERS
===================================================== */

const addPortalMembers = async (req, res) => {
    try {
        const { portalId } = req.params;
        const hostUserId = req.body?.hostUserId || req.query?.hostUserId;
        const { members } = req.body || {};
        const platformId = req.platformId || req.body?.platformId || req.query?.platformId;

        if (!hostUserId) {
            return res.status(400).json({
                message:
                    "hostUserId is required",
            });
        }

        if (
            !Array.isArray(members) ||
            members.length === 0
        ) {
            return res.status(400).json({
                message:
                    "members array is required",
            });
        }

        const portal = req.portal || await getPortalById(portalId, platformId);
        const host = await getMember({
            portalId,
            userId: hostUserId,
            platformId,
        });

        const isHostOrAdmin =
            (host && (host.role === "host" || host.role === "admin")) ||
            portal?.createdBy === hostUserId;

        if (!isHostOrAdmin) {
            return res.status(403).json({
                message:
                    "Only host or admin can add members",
            });
        }

        const newMembers =
            members.map((member) => ({
                portalId,
                platformId,
                userId: member.userId,
                role: member.role || "participant",
                addedBy: hostUserId,
            }));

        const createdMembers =
            await addMembers(
                newMembers
            );

        if (io) {
            const platformIdVal = platformId || host?.platformId || portal?.platformId;
            createdMembers.forEach(
                (member) => {
                    io.to(
                        userRoom(platformIdVal || member.platformId, member.userId)
                    ).emit(
                        "announcement:member-added",
                        {
                            portalId,
                            userId:
                                member.userId,
                        }
                    );
                }
            );

            if (hostUserId) {
                io.to(
                    userRoom(platformIdVal || host?.platformId, hostUserId)
                ).emit(
                    "announcement:member-added",
                    {
                        portalId,
                        userId:
                            hostUserId,
                    }
                );
            }
        }

        return res.status(201).json({
            message:
                "Members added successfully",
            members:
                createdMembers,
        });

    } catch (error) {
        console.error(
            "Add portal members error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to add members",
            error:
                error.message,
        });
    }
};


/* =====================================================
   CREATE ANNOUNCEMENT
===================================================== */

const createAnnouncement = async (
    req,
    res
) => {
    try {
        
        const { portalId } =
            req.params;
        const platformId =
            req.platformId ||
            req.body?.platformId ||
            req.query?.platformId;

        if (!platformId) {
            return res.status(400).json({
                message: "platformId is required",
            });
        }

        const {
            senderId,
            title,
            content,
            targetAudience = "all",
            expiresAt,
        } = req.body;

        let {
            targetUserIds = [],
        } = req.body;


        /* -----------------------------------------
           Normalize targetUserIds
        ----------------------------------------- */

        if (
            typeof targetUserIds ===
            "string"
        ) {
            try {
                targetUserIds =
                    JSON.parse(
                        targetUserIds
                    );
            } catch {
                targetUserIds = [
                    targetUserIds,
                ];
            }
        }

        if (
            !Array.isArray(
                targetUserIds
            )
        ) {
            targetUserIds = [
                targetUserIds,
            ];
        }

        // Remove empty values and duplicates
        targetUserIds = [
            ...new Set(
                targetUserIds.filter(
                    Boolean
                )
            ),
        ];

        if (req.body?.senderId && !targetUserIds.includes(req.body.senderId)) {
            targetUserIds.push(req.body.senderId);
        }


        /* -----------------------------------------
           Basic validation
        ----------------------------------------- */

        if (!senderId) {
            return res.status(400).json({
                message:
                    "senderId is required",
            });
        }

        if (
            !title ||
            !title.trim()
        ) {
            return res.status(400).json({
                message:
                    "Announcement title is required",
            });
        }

        if (
            !content ||
            !content.trim()
        ) {
            return res.status(400).json({
                message:
                    "Announcement content is required",
            });
        }

        if (
            !["all", "selected"].includes(
                targetAudience
            )
        ) {
            return res.status(400).json({
                message:
                    "Invalid targetAudience",
            });
        }


        /* -----------------------------------------
           Check sender membership
        ----------------------------------------- */

        const sender =
            await getMember({
                portalId,
                userId: senderId,
            });

        if (!sender) {
            return res.status(403).json({
                message:
                    "User is not a member of this announcement portal",
            });
        }


        /* -----------------------------------------
           Only host/admin can create
        ----------------------------------------- */

        if (
            sender.role !== "host" &&
            sender.role !== "admin"
        ) {
            return res.status(403).json({
                message:
                    "Only host or admin can create announcements",
            });
        }


        /* -----------------------------------------
           Validate selected audience
        ----------------------------------------- */

        if (
            targetAudience ===
            "selected"
        ) {

            if (
                targetUserIds.length ===
                0
            ) {
                return res.status(400).json({
                    message:
                        "targetUserIds is required when targetAudience is selected",
                });
            }


            // Get all portal members
            const selectedMembers =
                await getMembersByPortal(
                    portalId
                );


            // Any member of the portal (host, admin, participant) can be selected
            const validMemberUserIds =
                selectedMembers
                    .map(
                        (member) =>
                            member.userId
                    );


            const invalidUserIds =
                targetUserIds.filter(
                    (uId) =>
                        !validMemberUserIds.includes(
                            uId
                        )
                );


            if (
                invalidUserIds.length >
                0
            ) {
                return res.status(400).json({
                    message:
                        "Some selected users are not members of this portal",
                    invalidUserIds,
                });
            }
        }


        /* -----------------------------------------
           Upload attachments
        ----------------------------------------- */

        const attachments = [];

        for (const file of req.files || []) {
            const encryptedFile = encryptFile(
                file.buffer,
                {
                    platformId,
                    entity: "announcement-file",
                }
            );

            const uploadResult = await new Promise(
                (resolve, reject) => {
                    const uploadStream =
                        cloudinary.uploader.upload_stream(
                            {
                                resource_type: "auto",
                                folder:
                                    `communication-widget/${platformId}/announcements`,
                            },
                            (error, result) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(result);
                                }
                            }
                        );

                    uploadStream.end(encryptedFile);
                }
            );

            attachments.push({
                url: uploadResult.secure_url,
                fileName: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                publicId: uploadResult.public_id,
                resourceType: uploadResult.resource_type,
            });
        }


        /* -----------------------------------------
           Create announcement
        ----------------------------------------- */

        const announcementId =
            crypto.randomBytes(
                12
            ).toString("hex");


        const portal = await getPortalById(portalId);
        // const platformId = req.body?.platformId || req.query?.platformId || portal?.platformId;

        const announcement =
            await createAnnouncementCassandra({
                announcementId,

                portalId,

                platformId,

                senderId,

                title:
                    title.trim(),

                content:
                    content.trim(),

                attachments,

                targetAudience,

                // Keep this as ARRAY here.
                // Repository converts it to
                // Cassandra Set.
                targetUserIds:
                    targetAudience ===
                    "selected"
                        ? targetUserIds
                        : [],

                expiresAt:
                    expiresAt || null,
            });


        if (io) {
            try {
                const members = await getMembersByPortal(portalId);
                members.forEach((member) => {
                    io.to(userRoom(platformId, member.userId)).emit(
                        "announcement:created",
                        {
                            portalId,
                            announcement,
                        }
                    );
                });
                io.to(announcementRoom(platformId, portalId)).emit(
                    "announcement:created",
                    {
                        portalId,
                        announcement,
                    }
                );
            } catch (err) {
                console.error("Socket emit error on createAnnouncement:", err.message);
            }
        }

        return res.status(201).json({
            message:
                "Announcement created successfully",

            announcement,
        });

    } catch (error) {

        console.error(
            "Create announcement error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to create announcement",

            error:
                error.message,
        });
    }
};


/* =====================================================
   DOWNLOAD / DECRYPT ANNOUNCEMENT ATTACHMENT
===================================================== */

const downloadAnnouncementAttachment = async (
    req,
    res
) => {
    try {
        
            console.log("announcment controlled download called");
        const {
            portalId,
            announcementId,
        } = req.params;
        const platformId =
            req.platformId ||
            req.body?.platformId ||
            req.query?.platformId;
        const {
            publicId,
            userId,
            fileType,
            fileName,
            resourceType = "raw",
        } = req.query;

        /* -------------------------------------------------
         * Validate required fields
         * ------------------------------------------------- */

        if (!platformId) {
            return res.status(400).json({
                message: "platformId is required",
            });
        }

        if (!userId) {
            return res.status(400).json({
                message: "userId is required",
            });
        }

        if (!publicId) {
            return res.status(400).json({
                message: "publicId is required",
            });
        }

        /* -------------------------------------------------
         * Verify portal belongs to platform
         * ------------------------------------------------- */

        const portal = await getPortalById(
            portalId
        );

        if (
            !portal ||
            portal.platformId !== platformId
        ) {
            return res.status(404).json({
                message:
                    "Portal not found on this platform",
            });
        }

        /* -------------------------------------------------
         * Verify user belongs to portal
         * ------------------------------------------------- */

        const member = await getMember({
            portalId,
            userId,
            platformId,
        });

        const isPortalMember =
            member ||
            portal.createdBy === userId;

        if (!isPortalMember) {
            return res.status(403).json({
                message:
                    "You are not a member of this announcement portal",
            });
        }

        /* -------------------------------------------------
         * Get announcement
         * ------------------------------------------------- */

        const announcement =
            await getAnnouncementById(
                announcementId,
                platformId
            );

        if (
            !announcement ||
            announcement.portalId !== portalId ||
            announcement.platformId !== platformId
        ) {
            return res.status(404).json({
                message:
                    "Announcement not found on this platform",
            });
        }

        /* -------------------------------------------------
         * Verify attachment belongs to announcement
         * ------------------------------------------------- */

        const attachments =
            announcement.attachments || [];

        const attachment =
            attachments.find(
                (item) =>
                    item.publicId === publicId
            );

        if (!attachment) {
            return res.status(404).json({
                message:
                    "Attachment not found in this announcement",
            });
        }

        /* -------------------------------------------------
         * Verify Cloudinary publicId belongs
         * to current platform
         * ------------------------------------------------- */

        const expectedPrefix =
            `communication-widget/${platformId}/`;

        if (
            !publicId.startsWith(
                expectedPrefix
            )
        ) {
            return res.status(403).json({
                message:
                    "File does not belong to this platform",
            });
        }

        /* -------------------------------------------------
         * IMPORTANT:
         *
         * Announcement files were encrypted using:
         *
         * entity: "announcement-file"
         *
         * Therefore decryption MUST use the
         * exact same entity.
         * ------------------------------------------------- */

        const encryptedUrl =
            cloudinary.url(
                publicId,
                {
                    resource_type:
                        attachment.resourceType ||
                        resourceType,
                    secure: true,
                }
            );

        /* -------------------------------------------------
         * Fetch encrypted file
         * ------------------------------------------------- */

        const response =
            await fetch(
                encryptedUrl
            );

        if (!response.ok) {
            console.error(
                "Cloudinary attachment fetch failed:",
                response.status,
                encryptedUrl
            );

            return res.status(404).json({
                message:
                    "Encrypted attachment not found",
            });
        }

        const encryptedBuffer =
            Buffer.from(
                await response.arrayBuffer()
            );

        /* -------------------------------------------------
         * Decrypt using centralized service
         * ------------------------------------------------- */

        const decryptedFile =
            decryptFile(
                encryptedBuffer,
                {
                    platformId,
                    entity:
                        "announcement-file",
                }
            );

        /* -------------------------------------------------
         * Return original file
         * ------------------------------------------------- */

        res.setHeader(
            "Content-Type",
            attachment.fileType ||
                fileType ||
                "application/octet-stream"
        );

        const originalFileName =
            attachment.fileName ||
            fileName ||
            "attachment";

        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(
                originalFileName
            )}"`
        );

        return res.send(
            decryptedFile
        );

    } catch (error) {
        console.error(
            "Download announcement attachment error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to download announcement attachment",
            error:
                error.message,
        });
    }
};


/* =====================================================
   GET ANNOUNCEMENTS
===================================================== */

const getAnnouncements = async (
    req,
    res
) => {
    try {
        const { portalId } =
            req.params;

        const { userId } =
            req.query;

        if (!userId) {
            return res.status(400).json({
                message:
                    "userId is required",
            });
        }

        const portal =
            await getPortalById(
                portalId
            );

        if (!portal) {
            return res.status(404).json({
                code:
                    "PORTAL_DELETED",

                message:
                    "This announcement portal has been deleted.",
            });
        }

        const member =
            await getMember({
                portalId,
                userId,
            });

        if (!member) {
            return res.status(403).json({
                code:
                    "NOT_A_MEMBER",

                message:
                    "You have been removed from this announcement portal.",
            });
        }

        const announcements =
            await getAnnouncementsByPortal(
                portalId
            );

        const now =
            new Date();

        const visibleAnnouncements =
            announcements.filter(
                (
                    announcement
                ) => {

                    const notExpired =
                        !announcement.expiresAt ||
                        new Date(
                            announcement.expiresAt
                        ) > now;


                    const visibleToUser =
                        announcement.senderId === userId ||
                        announcement
                            .targetAudience ===
                            "all" ||

                        (
                            announcement
                                .targetAudience ===
                                "selected" &&

                            announcement
                                .targetUserIds
                                .includes(
                                    userId
                                )
                        );


                    return (
                        notExpired &&
                        visibleToUser
                    );
                }
            );

        return res.status(200).json({
            message:
                "Announcements fetched successfully",

            announcements:
                visibleAnnouncements,
        });

    } catch (error) {

        console.error(
            "Get announcements error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to fetch announcements",

            error:
                error.message,
        });
    }
};


/* =====================================================
   UPDATE ANNOUNCEMENT
===================================================== */

const updateAnnouncement = async (
    req,
    res
) => {
    try {
        const {
            portalId,
            announcementId,
        } = req.params;

        const {
            userId,
            title,
            content,
            targetAudience,
            expiresAt,
        } = req.body;

        const platformId = req.platformId || req.body?.platformId || req.query?.platformId;

        if (!userId) {
            return res.status(400).json({
                message:
                    "userId is required",
            });
        }

        const member =
            await getMember({
                portalId,
                userId,
                platformId,
            });

        if (!member) {
            return res.status(403).json({
                message:
                    "User is not a member of this announcement portal",
            });
        }

        if (
            member.role !== "host" &&
            member.role !== "admin"
        ) {
            return res.status(403).json({
                message:
                    "Only host or admin can update announcements",
            });
        }

        const announcement =
            await getAnnouncementById(
                announcementId,
                platformId
            );

        if (
            !announcement ||
            announcement.portalId !==
                portalId
        ) {
            return res.status(404).json({
                message:
                    "Announcement not found",
            });
        }

        const updated =
            await updateAnnouncementCassandra({
                announcementId,
                portalId,
                platformId,

                title:
                    title !== undefined
                        ? title.trim()
                        : undefined,

                content:
                    content !== undefined
                        ? content.trim()
                        : undefined,

                targetAudience,

                expiresAt:
                    expiresAt !== undefined
                        ? expiresAt || null
                        : undefined,
            });

        if (io) {
            try {
                const platformIdVal = platformId || announcement.platformId;
                const members = await getMembersByPortal(portalId, platformIdVal);
                members.forEach((member) => {
                    io.to(userRoom(platformIdVal, member.userId)).emit(
                        "announcement:updated",
                        {
                            portalId,
                            announcement: updated,
                        }
                    );
                });
                io.to(announcementRoom(platformIdVal, portalId)).emit(
                    "announcement:updated",
                    {
                        portalId,
                        announcement: updated,
                    }
                );
            } catch (err) {
                console.error("Socket emit error on updateAnnouncement:", err.message);
            }
        }

        return res.status(200).json({
            message:
                "Announcement updated successfully",

            announcement:
                updated,
        });

    } catch (error) {

        console.error(
            "Update announcement error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update announcement",

            error:
                error.message,
        });
    }
};


/* =====================================================
   DELETE ANNOUNCEMENT
===================================================== */

const deleteAnnouncement = async (
    req,
    res
) => {
    try {
        const {
            portalId,
            announcementId,
        } = req.params;

        const userId =
            req.query?.userId || req.body?.userId;

        const platformId = req.platformId || req.query?.platformId || req.body?.platformId;

        if (!userId) {
            return res.status(400).json({
                message:
                    "userId is required",
            });
        }


        const announcement =
            await getAnnouncementById(
                announcementId,
                platformId
            );

        if (
            !announcement ||
            announcement.portalId !==
                portalId
        ) {
            return res.status(404).json({
                message:
                    "Announcement not found",
            });
        }


        const membership =
            await getMember({
                portalId,
                userId,
                platformId,
            });

        if (!membership) {
            return res.status(403).json({
                message:
                    "You are not a member of this portal",
            });
        }


        if (
            membership.role !==
                "host" &&
            membership.role !==
                "admin"
        ) {
            return res.status(403).json({
                message:
                    "Only host or admin can delete announcements",
            });
        }


        for (
            const attachment
            of announcement.attachments ||
            []
        ) {

            if (
                !attachment.publicId
            ) {
                continue;
            }

            try {

                await cloudinary
                    .uploader
                    .destroy(
                        attachment.publicId,
                        {
                            resource_type:
                                attachment.resourceType ||
                                "image",
                        }
                    );

                console.log(
                    "Cloudinary attachment deleted:",
                    attachment.publicId
                );

            } catch (
                cloudinaryError
            ) {

                console.error(
                    "Cloudinary attachment deletion failed:",
                    cloudinaryError.message
                );

                return res.status(500).json({
                    message:
                        "Failed to delete announcement attachment",

                    error:
                        cloudinaryError.message,
                });
            }
        }


        await deleteAnnouncementCassandra({
            announcementId,
            portalId,
            platformId,
        });

        if (io) {
            try {
                const platformIdVal = platformId || announcement.platformId;
                const members = await getMembersByPortal(portalId, platformIdVal);
                members.forEach((member) => {
                    io.to(userRoom(platformIdVal, member.userId)).emit(
                        "announcement:deleted",
                        {
                            portalId,
                            announcementId,
                        }
                    );
                });
                io.to(announcementRoom(platformIdVal, portalId)).emit(
                    "announcement:deleted",
                    {
                        portalId,
                        announcementId,
                    }
                );
            } catch (err) {
                console.error("Socket emit error on deleteAnnouncement:", err.message);
            }
        }

        return res.status(200).json({
            message:
                "Announcement deleted successfully",
        });

    } catch (error) {

        console.error(
            "Failed to delete announcement:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to delete announcement",

            error:
                error.message,
        });
    }
};


/* =====================================================
   GET SINGLE ANNOUNCEMENT
===================================================== */

const getAnnouncement = async (
    req,
    res
) => {
    try {
        const {
            portalId,
            announcementId,
        } = req.params;

        const { userId } =
            req.query;

        if (!userId) {
            return res.status(400).json({
                message:
                    "userId is required",
            });
        }

        const member =
            await getMember({
                portalId,
                userId,
            });

        if (!member) {
            return res.status(403).json({
                message:
                    "User is not a member of this announcement portal",
            });
        }

        const announcement =
            await getAnnouncementById(
                announcementId
            );

        if (
            !announcement ||
            announcement.portalId !==
                portalId
        ) {
            return res.status(404).json({
                message:
                    "Announcement not found",
            });
        }

        const expired =
            announcement.expiresAt &&
            new Date(
                announcement.expiresAt
            ) <= new Date();

        if (expired) {
            return res.status(404).json({
                message:
                    "Announcement not found",
            });
        }

        const visible =
            announcement
                .targetAudience ===
                "all" ||

            (
                announcement
                    .targetAudience ===
                    "selected" &&

                announcement
                    .targetUserIds
                    .includes(
                        userId
                    )
            );

        if (!visible) {
            return res.status(404).json({
                message:
                    "Announcement not found",
            });
        }

        return res.status(200).json({
            message:
                "Announcement fetched successfully",

            announcement,
        });

    } catch (error) {

        console.error(
            "Get announcement error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to fetch announcement",

            error:
                error.message,
        });
    }
};


/* =====================================================
   GET USER ANNOUNCEMENT PORTALS
===================================================== */

const getUserAnnouncementPortals =
    async (req, res) => {
        try {
            const { userId, platformId } =
                req.query;

            if (!userId) {
                return res.status(400).json({
                    message:
                        "userId is required",
                });
            }

            const memberships =
                await getPortalsByUser(
                    userId
                );

            if (!memberships.length) {
                return res.status(200).json(
                    []
                );
            }

            const membershipMap =
                new Map(
                    memberships.map(
                        (
                            membership
                        ) => [
                            membership.portalId,
                            membership.role,
                        ]
                    )
                );

            const portals = [];

            for (
                const membership
                of memberships
            ) {

                const portal =
                    await getPortalById(
                        membership.portalId
                    );

                if (!portal || portal.platformId !== platformId) {
                    continue;
                }

                const members =
                    await getMembersByPortal(
                        membership.portalId
                    );

                portals.push({
                    ...portal,

                    role:
                        membershipMap.get(
                            portal._id
                        ),

                    members:
                        members.map(
                            (member) => ({
                                userId:
                                    member.userId,

                                role:
                                    member.role,
                            })
                        ),
                });
            }

            return res.status(200).json(
                portals
            );

        } catch (error) {

            console.error(
                "Failed to get user announcement portals:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to get announcement portals",

                error:
                    error.message,
            });
        }
    };


/* =====================================================
   GET PORTAL MEMBERS
===================================================== */

const getPortalMembers = async (
    req,
    res
) => {
    try {
        const { portalId } =
            req.params;

        const { userId } =
            req.query;

        if (!userId) {
            return res.status(400).json({
                message:
                    "userId is required",
            });
        }

        const requester =
            await getMember({
                portalId,
                userId,
            });

        if (!requester) {
            return res.status(403).json({
                message:
                    "You are not a member of this portal",
            });
        }

        const members =
            await getMembersByPortal(
                portalId
            );

        members.sort(
            (a, b) =>
                new Date(
                    a.createdAt
                ) -
                new Date(
                    b.createdAt
                )
        );

        return res.status(200).json({
            message:
                "Portal members fetched successfully",

            members,
        });

    } catch (error) {

        console.error(
            "Get portal members error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to fetch portal members",

            error:
                error.message,
        });
    }
};


/* =====================================================
   REMOVE PORTAL MEMBER
===================================================== */

/* =====================================================
   REMOVE PORTAL MEMBER
===================================================== */

const removePortalMember = async (
    req,
    res
) => {
    try {
        const {
            portalId,
            userId,
        } = req.params;

        const hostUserId =
            req.body?.hostUserId || req.query?.hostUserId;

        const platformId = req.platformId || req.body?.platformId || req.query?.platformId;

        if (!hostUserId) {
            return res.status(400).json({
                message:
                    "hostUserId is required",
            });
        }

        const portal =
            req.portal ||
            (await getPortalById(
                portalId,
                platformId
            ));

        if (!portal) {
            return res.status(404).json({
                message:
                    "Announcement portal not found",
            });
        }

        const requester =
            await getMember({
                portalId,
                userId: hostUserId,
                platformId,
            });

        const isHostOrAdmin =
            (requester &&
                (requester.role === "host" ||
                    requester.role === "admin")) ||
            portal.createdBy === hostUserId;

        if (!isHostOrAdmin) {
            return res.status(403).json({
                message:
                    "Only host or admin can remove members",
            });
        }

        if (
            userId ===
            portal.createdBy
        ) {
            return res.status(400).json({
                message:
                    "Host cannot be removed from the portal",
            });
        }

        const member =
            await getMember({
                portalId,
                userId,
                platformId,
            });

        if (!member) {
            return res.status(404).json({
                message:
                    "Member not found in this portal",
            });
        }

        await removeMember({
            portalId,
            userId,
            platformId,
        });

        if (io) {
            const platformIdVal = platformId || portal?.platformId || member?.platformId;
            if (userId) {
                io.to(
                    userRoom(platformIdVal, userId)
                ).emit(
                    "announcement:member-removed",
                    {
                        portalId,
                        userId,
                    }
                );
            }

            if (hostUserId) {
                io.to(
                    userRoom(platformIdVal, hostUserId)
                ).emit(
                    "announcement:member-removed",
                    {
                        portalId,
                        userId,
                    }
                );
            }
        }

        return res.status(200).json({
            message:
                "Member removed successfully",

            removedMember: {
                userId:
                    member.userId,

                role:
                    member.role,
            },
        });

    } catch (error) {

        console.error(
            "Error removing portal member:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to remove portal member",

            error:
                error.message,
        });
    }
};


/* =====================================================
   UPDATE PORTAL MEMBER ROLE
===================================================== */

const updatePortalMemberRole = async (
    req,
    res
) => {
    try {
        const {
            portalId,
            userId,
        } = req.params;

        const {
            role,
        } = req.body || {};

        const hostUserId =
            req.body?.hostUserId || req.query?.hostUserId;

        const platformId = req.platformId || req.body?.platformId || req.query?.platformId;

        if (!hostUserId) {
            return res.status(400).json({
                message:
                    "hostUserId is required",
            });
        }

        if (
            ![
                "host",
                "participant",
            ].includes(role)
        ) {
            return res.status(400).json({
                message:
                    "Invalid role",
            });
        }

        const portal =
            req.portal ||
            (await getPortalById(
                portalId,
                platformId
            ));

        if (!portal) {
            return res.status(404).json({
                message:
                    "Announcement portal not found",
            });
        }

        const requester =
            await getMember({
                portalId,
                userId:
                    hostUserId,
                platformId,
            });

        const isHostOrAdmin =
            (requester &&
                (requester.role === "host" ||
                    requester.role === "admin")) ||
            portal.createdBy === hostUserId;

        if (!isHostOrAdmin) {
            return res.status(403).json({
                message:
                    "Only hosts or admins can change member roles",
            });
        }

        if (
            userId ===
                portal.createdBy &&
            role !== "host"
        ) {
            return res.status(403).json({
                message:
                    "Portal creator must remain host",
            });
        }

        if (
            userId ===
            hostUserId
        ) {
            return res.status(400).json({
                message:
                    "You cannot change your own role",
            });
        }

        const member =
            await getMember({
                portalId,
                userId,
                platformId,
            });

        if (!member) {
            return res.status(404).json({
                message:
                    "Member not found in this portal",
            });
        }

        const updatedMember =
            await updateMemberRole({
                portalId,
                userId,
                role,
                platformId,
            });

        if (io) {
            const platformIdVal = platformId || member?.platformId || portal?.platformId;
            if (userId) {
                io.to(
                    userRoom(platformIdVal, userId)
                ).emit(
                    "announcement:member-role-updated",
                    {
                        portalId,
                        userId,
                        role,
                    }
                );
            }

            if (hostUserId) {
                io.to(
                    userRoom(platformIdVal, hostUserId)
                ).emit(
                    "announcement:member-role-updated",
                    {
                        portalId,
                        userId,
                        role,
                    }
                );
            }
        }

        return res.status(200).json({
            message:
                "Member role updated successfully",

            member: {
                userId:
                    updatedMember.userId,

                role:
                    updatedMember.role,
            },
        });

    } catch (error) {

        console.error(
            "Update portal member role error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update member role",

            error:
                error.message,
        });
    }
};


/* =====================================================
   DELETE ANNOUNCEMENT PORTAL
===================================================== */

const deleteAnnouncementPortal =
    async (
        req,
        res
    ) => {
        try {

            const { portalId } =
                req.params;

            const userId =
                req.body?.userId || req.query?.userId;

            const platformId = req.platformId || req.body?.platformId || req.query?.platformId;

            if (!userId) {
                return res.status(400).json({
                    message:
                        "userId is required",
                });
            }

            const portal =
                req.portal ||
                (await getPortalById(
                    portalId,
                    platformId
                ));

            if (!portal) {
                return res.status(404).json({
                    message:
                        "Announcement portal not found",
                });
            }

            const member =
                await getMember({
                    portalId,
                    userId,
                    platformId,
                });

            const isHostOrAdmin =
                (member &&
                    (member.role === "host" ||
                        member.role === "admin")) ||
                portal.createdBy === userId;

            if (!isHostOrAdmin) {
                return res.status(403).json({
                    message:
                        "Only portal hosts or admins can delete the portal",
                });
            }

            const portalMembers =
                await getMembersByPortal(
                    portalId,
                    platformId
                );

            for (
                const portalMember
                of portalMembers
            ) {

                await removeMember({
                    portalId,

                    userId:
                        portalMember.userId,
                    platformId,
                });
            }

            if (io) {
                const platformIdVal = platformId || portal.platformId;
                portalMembers.forEach(
                    (member) => {

                        io.to(
                            userRoom(platformIdVal, member.userId)
                        ).emit(
                            "announcement:portal-deleted",
                            {
                                portalId,
                            }
                        );
                    }
                );
            }

            await deletePortal(
                portalId,
                platformId
            );

            return res.status(200).json({
                message:
                    "Announcement portal deleted successfully",
            });

        } catch (error) {

            console.error(
                "Delete announcement portal error:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to delete announcement portal",

                error:
                    error.message,
            });
        }
    };


/* =====================================================
   EXPORTS
===================================================== */

export {
    createAnnouncementPortal,
    addPortalMembers,
    createAnnouncement,
    getAnnouncements,
    getAnnouncement,
    downloadAnnouncementAttachment,
    updateAnnouncement,
    deleteAnnouncement,
    getUserAnnouncementPortals,
    getPortalMembers,
    removePortalMember,
    updatePortalMemberRole,
    deleteAnnouncementPortal,
};