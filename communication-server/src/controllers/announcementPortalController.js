import cloudinary from "../config/cloudinary.js";
import crypto from "crypto";

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
        } = req.body || {};

        console.log(
            "CREATE PORTAL BODY:",
            req.body
        );

        if (!userId) {
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
        });

        const membership = await addMember({
            portalId,
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
                    `user:${memberId}`
                ).emit(
                    "announcement:portal-created",
                    {
                        portalId,
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
        const {
            hostUserId,
            members,
        } = req.body;

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

        const host = await getMember({
            portalId,
            userId: hostUserId,
        });

        if (
            !host ||
            host.role !== "host"
        ) {
            return res.status(403).json({
                message:
                    "Only the host can add members",
            });
        }

        const newMembers =
            members.map((member) => ({
                portalId,
                userId: member.userId,
                role: member.role,
                addedBy: hostUserId,
            }));

        const createdMembers =
            await addMembers(
                newMembers
            );

        if (io) {
            createdMembers.forEach(
                (member) => {
                    io.to(
                        `user:${member.userId}`
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

            io.to(
                `user:${hostUserId}`
            ).emit(
                "announcement:member-added",
                {
                    portalId,
                    userId:
                        hostUserId,
                }
            );
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


            // Only participants can be selected
            const selectedParticipantIds =
                selectedMembers
                    .filter(
                        (member) =>
                            member.role ===
                            "participant"
                    )
                    .map(
                        (member) =>
                            member.userId
                    );


            const invalidUserIds =
                targetUserIds.filter(
                    (userId) =>
                        !selectedParticipantIds.includes(
                            userId
                        )
                );


            if (
                invalidUserIds.length >
                0
            ) {
                return res.status(400).json({
                    message:
                        "Some selected users are not participants of this portal",
                    invalidUserIds,
                });
            }
        }


        /* -----------------------------------------
           Upload attachments
        ----------------------------------------- */

        const attachments = [];

        for (
            const file
            of req.files || []
        ) {

            const uploadResult =
                await new Promise(
                    (
                        resolve,
                        reject
                    ) => {

                        const uploadStream =
                            cloudinary
                                .uploader
                                .upload_stream(
                                    {
                                        resource_type:
                                            "auto",

                                        folder:
                                            "communication-widget/announcements",
                                    },

                                    (
                                        error,
                                        result
                                    ) => {

                                        if (
                                            error
                                        ) {
                                            reject(
                                                error
                                            );
                                        } else {
                                            resolve(
                                                result
                                            );
                                        }
                                    }
                                );

                        uploadStream.end(
                            file.buffer
                        );
                    }
                );


            attachments.push({
                url:
                    uploadResult.secure_url,

                fileName:
                    file.originalname,

                fileType:
                    file.mimetype,

                fileSize:
                    file.size,

                publicId:
                    uploadResult.public_id,

                resourceType:
                    uploadResult.resource_type,
            });
        }


        /* -----------------------------------------
           Create announcement
        ----------------------------------------- */

        const announcementId =
            crypto.randomBytes(
                12
            ).toString("hex");


        const announcement =
            await createAnnouncementCassandra({
                announcementId,

                portalId,

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

        const updated =
            await updateAnnouncementCassandra({
                announcementId,

                portalId,

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

        const {
            userId,
        } = req.query;

        if (!userId) {
            return res.status(400).json({
                message:
                    "userId is required",
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


        const membership =
            await getMember({
                portalId,
                userId,
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
        });


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
            const { userId } =
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

                if (!portal) {
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

const removePortalMember = async (
    req,
    res
) => {
    try {
        const {
            portalId,
            userId,
        } = req.params;

        const {
            hostUserId,
        } = req.body;

        if (!hostUserId) {
            return res.status(400).json({
                message:
                    "hostUserId is required",
            });
        }

        const portal =
            await getPortalById(
                portalId
            );

        if (!portal) {
            return res.status(404).json({
                message:
                    "Announcement portal not found",
            });
        }

        if (
            portal.createdBy !==
            hostUserId
        ) {
            return res.status(403).json({
                message:
                    "Only the host can remove members",
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
        });

        if (io) {

            io.to(
                `user:${userId}`
            ).emit(
                "announcement:member-removed",
                {
                    portalId,
                    userId,
                }
            );

            io.to(
                `user:${hostUserId}`
            ).emit(
                "announcement:member-removed",
                {
                    portalId,
                    userId,
                }
            );
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
            hostUserId,
            role,
        } = req.body;

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
            await getPortalById(
                portalId
            );

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
            });

        if (
            !requester ||
            requester.role !==
                "host"
        ) {
            return res.status(403).json({
                message:
                    "Only hosts can change member roles",
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
            });

        if (io) {

            io.to(
                `user:${userId}`
            ).emit(
                "announcement:member-role-updated",
                {
                    portalId,
                    userId,
                    role,
                }
            );

            io.to(
                `user:${hostUserId}`
            ).emit(
                "announcement:member-role-updated",
                {
                    portalId,
                    userId,
                    role,
                }
            );
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

            const { userId } =
                req.body;

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
                    message:
                        "Announcement portal not found",
                });
            }

            const member =
                await getMember({
                    portalId,
                    userId,
                });

            if (
                !member ||
                member.role !==
                    "host"
            ) {
                return res.status(403).json({
                    message:
                        "Only portal hosts can delete the portal",
                });
            }

            const portalMembers =
                await getMembersByPortal(
                    portalId
                );

            for (
                const portalMember
                of portalMembers
            ) {

                await removeMember({
                    portalId,

                    userId:
                        portalMember.userId,
                });
            }

            if (io) {

                portalMembers.forEach(
                    (member) => {

                        io.to(
                            `user:${member.userId}`
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
                portalId
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
    updateAnnouncement,
    deleteAnnouncement,
    getUserAnnouncementPortals,
    getPortalMembers,
    removePortalMember,
    updatePortalMemberRole,
    deleteAnnouncementPortal,
};