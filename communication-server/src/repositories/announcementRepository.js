import cassandra from "../config/cassandra.js";
import {
    encrypt,
    decrypt,
} from "../service/encryptionService.js";

/* =====================================================
   HELPERS
===================================================== */

const serializeAttachments = (attachments) => {
    if (
        !attachments ||
        !attachments.length
    ) {
        return null;
    }

    return JSON.stringify(
        attachments
    );
};


const deserializeAttachments = (
    attachments
) => {
    if (!attachments) {
        return [];
    }

    try {
        return JSON.parse(
            attachments
        );
    } catch {
        return [];
    }
};


/*
 * Cassandra returns a Set for set<text>.
 * Convert it to a normal JavaScript array
 * so the controller/API can work with it.
 */
const deserializeTargetUserIds = (
    targetUserIds
) => {
    if (!targetUserIds) {
        return [];
    }

    if (
        targetUserIds instanceof Set
    ) {
        return Array.from(
            targetUserIds
        );
    }

    if (
        Array.isArray(
            targetUserIds
        )
    ) {
        return targetUserIds;
    }

    return [];
};


/* =====================================================
   ROW MAPPERS
===================================================== */

const rowToPortal = (row) => {
    if (!row) {
        return null;
    }

    return {
        _id:
            row.portal_id,

        name:
            row.name
            ?decrypt(
                row.name,
                {
                    platformId:row.platform_id,
                    entity:"portal",
                    field:"name",
                }
            ):"",

        description:
            row.description
            ?decrypt(
                row.description,
                {
                    platformId:row.platform_id,
                    entity:"portal",
                    field:"description",
                }
            ): "",

        createdBy:
            row.created_by,

        targetAudience:
            row.target_audience ||
            "all",

        createdAt:
            row.created_at,

        updatedAt:
            row.updated_at,

        platformId:
            row.platform_id,
    };
};


const rowToMember = (row) => {
    if (!row) {
        return null;
    }

    return {
        _id: undefined,

        portalId:
            row.portal_id,

        userId:
            row.user_id,

        role:
            row.role,

        addedBy:
            row.added_by,

        createdAt:
            row.created_at,

        updatedAt:
            row.updated_at,
    };
};


const rowToAnnouncement = (row) => {
    if (!row) {
        return null;
    }

    return {
        _id:
            row.announcement_id,

        portalId:
            row.portal_id,

        senderId:
            row.sender_id,

        title:
            row.title
            ?decrypt(row.title,
            {
                platformId:row.platform_id,
                entity:"announcement",
                field:"title",

            }):"",

        content:
            row.content
            ?decrypt(row.content,
            {
                platformId:row.platform_id,
                entity:"announcement",
                field:"content",

            }):"",

        attachments:
            deserializeAttachments(
                row.attachments
            ),

        targetAudience:
            row.target_audience ||
            "all",

        targetUserIds:
            deserializeTargetUserIds(
                row.target_user_ids
            ),

        publishedAt:
            row.published_at,

        expiresAt:
            row.expires_at || null,

        createdAt:
            row.created_at,

        updatedAt:
            row.updated_at,
    };
};


/* =====================================================
   PORTALS
===================================================== */

export const createPortal = async ({
    portalId,
    name,
    description,
    createdBy,
    targetAudience,
    createdAt = new Date(),
    updatedAt = createdAt,
    platformId,
}) => {
    const encryptedName =
        encrypt(name,
            {
                platformId,
                entity:"portal",
                field:"name",
            }
        );
    
    const encryptedDescription =
        encrypt(description,{
            platformId,
            entity:"portal",
            field:"description",
        });

    await cassandra.execute(
        `
            INSERT INTO announcement_portals_by_id (
                portal_id,
                platform_id,
                name,
                description,
                created_by,
                target_audience,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            portalId,
            platformId,
            encryptedName,
            encryptedDescription || "",
            createdBy,
            targetAudience || "all",
            createdAt,
            updatedAt,
        ],
        {
            prepare: true,
        }
    );

    return {
        _id:
            portalId,

        name,

        description:
            description || "",

        createdBy,

        targetAudience:
            targetAudience || "all",

        createdAt,

        updatedAt,

        platformId,
    };
};


export const getPortalById = async (
    portalId,
    platformId
) => {
    if (platformId) {
        const result = await cassandra.execute(
            `
                SELECT *
                FROM announcement_portals_by_id
                WHERE platform_id = ?
                AND portal_id = ?
            `,
            [
                platformId,
                portalId,
            ],
            {
                prepare: true,
            }
        );
        return rowToPortal(result.rows[0]);
    }

    const result =
        await cassandra.execute(
            `
                SELECT *
                FROM announcement_portals_by_id
                WHERE portal_id = ?
                ALLOW FILTERING
            `,
            [
                portalId,
            ],
            {
                prepare: true,
            }
        );

    return rowToPortal(
        result.rows[0]
    );
};


export const deletePortal = async (
    portalId,
    platformId
) => {
    let platId = platformId;
    if (!platId) {
        const portal = await getPortalById(portalId);
        platId = portal?.platformId;
    }

    if (platId) {
        await cassandra.execute(
            `
                DELETE FROM announcement_portals_by_id
                WHERE platform_id = ?
                AND portal_id = ?
            `,
            [
                platId,
                portalId,
            ],
            {
                prepare: true,
            }
        );
    } else {
        await cassandra.execute(
            `
                DELETE FROM announcement_portals_by_id
                WHERE portal_id = ?
            `,
            [
                portalId,
            ],
            {
                prepare: true,
            }
        );
    }
};


/* =====================================================
   MEMBERS
===================================================== */

export const addMember = async ({
    portalId,
    platformId,
    userId,
    role,
    addedBy,
    createdAt = new Date(),
    updatedAt = createdAt,
}) => {

    await cassandra.batch(
        [
            {
                query: `
                    INSERT INTO portal_members_by_user (
                        platform_id,
                        user_id,
                        portal_id,
                        role,
                        added_by,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    userId,
                    portalId,
                    role,
                    addedBy,
                    createdAt,
                    updatedAt,
                ],
            },

            {
                query: `
                    INSERT INTO portal_members_by_portal (
                        platform_id,
                        portal_id,
                        user_id,
                        role,
                        added_by,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    portalId,
                    userId,
                    role,
                    addedBy,
                    createdAt,
                    updatedAt,
                ],
            },
        ],
        {
            prepare: true,
        }
    );

    return {
        portalId,
        platformId,
        userId,
        role,
        addedBy,
        createdAt,
        updatedAt,
    };
};


export const addMembers = async (
    members
) => {

    for (
        const member
        of members
    ) {
        await addMember(
            member
        );
    }

    return members;
};


export const getMember = async ({
    portalId,
    userId,
    platformId,
}) => {
    if (platformId) {
        const result = await cassandra.execute(
            `
                SELECT *
                FROM portal_members_by_portal
                WHERE platform_id = ?
                AND portal_id = ?
                AND user_id = ?
            `,
            [
                platformId,
                portalId,
                userId,
            ],
            {
                prepare: true,
            }
        );
        return rowToMember(result.rows[0]);
    }

    const result =
        await cassandra.execute(
            `
                SELECT *
                FROM portal_members_by_portal
                WHERE portal_id = ?
                AND user_id = ?
                ALLOW FILTERING
            `,
            [
                portalId,
                userId,
            ],
            {
                prepare: true,
            }
        );

    return rowToMember(
        result.rows[0]
    );
};


export const getMembersByPortal =
    async (
        portalId,
        platformId
    ) => {
        if (platformId) {
            const result = await cassandra.execute(
                `
                    SELECT *
                    FROM portal_members_by_portal
                    WHERE platform_id = ?
                    AND portal_id = ?
                `,
                [
                    platformId,
                    portalId,
                ],
                {
                    prepare: true,
                }
            );
            return result.rows.map(rowToMember);
        }

        const result =
            await cassandra.execute(
                `
                    SELECT *
                    FROM portal_members_by_portal
                    WHERE portal_id = ?
                    ALLOW FILTERING
                `,
                [
                    portalId,
                ],
                {
                    prepare: true,
                }
            );

        return result.rows.map(
            rowToMember
        );
    };


export const getPortalsByUser =
    async (
        userId,
        platformId
    ) => {
        if (platformId) {
            const result = await cassandra.execute(
                `
                    SELECT *
                    FROM portal_members_by_user
                    WHERE platform_id = ?
                    AND user_id = ?
                `,
                [
                    platformId,
                    userId,
                ],
                {
                    prepare: true,
                }
            );
            return result.rows.map(rowToMember);
        }

        const result =
            await cassandra.execute(
                `
                    SELECT *
                    FROM portal_members_by_user
                    WHERE user_id = ?
                    ALLOW FILTERING
                `,
                [
                    userId,
                ],
                {
                    prepare: true,
                }
            );

        return result.rows.map(
            rowToMember
        );
    };


export const updateMemberRole =
    async ({
        portalId,
        userId,
        role,
        platformId,
    }) => {

        let platId = platformId;
        if (!platId) {
            const existingMember = await getMember({ portalId, userId });
            platId = existingMember?.platformId;
        }

        const updatedAt =
            new Date();

        if (platId) {
            await cassandra.batch(
                [
                    {
                        query: `
                            UPDATE portal_members_by_user
                            SET role = ?,
                                updated_at = ?
                            WHERE platform_id = ?
                            AND user_id = ?
                            AND portal_id = ?
                        `,

                        params: [
                            role,
                            updatedAt,
                            platId,
                            userId,
                            portalId,
                        ],
                    },

                    {
                        query: `
                            UPDATE portal_members_by_portal
                            SET role = ?,
                                updated_at = ?
                            WHERE platform_id = ?
                            AND portal_id = ?
                            AND user_id = ?
                        `,

                        params: [
                            role,
                            updatedAt,
                            platId,
                            portalId,
                            userId,
                        ],
                    },
                ],
                {
                    prepare: true,
                }
            );
        } else {
            await cassandra.batch(
                [
                    {
                        query: `
                            UPDATE portal_members_by_user
                            SET role = ?,
                                updated_at = ?
                            WHERE user_id = ?
                            AND portal_id = ?
                        `,

                        params: [
                            role,
                            updatedAt,
                            userId,
                            portalId,
                        ],
                    },

                    {
                        query: `
                            UPDATE portal_members_by_portal
                            SET role = ?,
                                updated_at = ?
                            WHERE portal_id = ?
                            AND user_id = ?
                        `,

                        params: [
                            role,
                            updatedAt,
                            portalId,
                            userId,
                        ],
                    },
                ],
                {
                    prepare: true,
                }
            );
        }

        return getMember({
            portalId,
            userId,
            platformId: platId,
        });
    };


export const removeMember = async ({
    portalId,
    userId,
    platformId,
}) => {

    let platId = platformId;
    if (!platId) {
        const existingMember = await getMember({ portalId, userId });
        platId = existingMember?.platformId;
    }

    if (platId) {
        await cassandra.batch(
            [
                {
                    query: `
                        DELETE FROM portal_members_by_user
                        WHERE platform_id = ?
                        AND user_id = ?
                        AND portal_id = ?
                    `,

                    params: [
                        platId,
                        userId,
                        portalId,
                    ],
                },

                {
                    query: `
                        DELETE FROM portal_members_by_portal
                        WHERE platform_id = ?
                        AND portal_id = ?
                        AND user_id = ?
                    `,

                    params: [
                        platId,
                        portalId,
                        userId,
                    ],
                },
            ],
            {
                prepare: true,
            }
        );
    } else {
        await cassandra.batch(
            [
                {
                    query: `
                        DELETE FROM portal_members_by_user
                        WHERE user_id = ?
                        AND portal_id = ?
                    `,

                    params: [
                        userId,
                        portalId,
                    ],
                },

                {
                    query: `
                        DELETE FROM portal_members_by_portal
                        WHERE portal_id = ?
                        AND user_id = ?
                    `,

                    params: [
                        portalId,
                        userId,
                    ],
                },
            ],
            {
                prepare: true,
            }
        );
    }
};


/* =====================================================
   ANNOUNCEMENTS
===================================================== */

export const createAnnouncement = async ({
    announcementId,
    portalId,
    platformId,
    senderId,
    title,
    content,
    attachments = [],
    targetAudience = "all",
    targetUserIds = [],
    publishedAt = new Date(),
    expiresAt = null,
    createdAt = new Date(),
    updatedAt = createdAt,
}) => {
    if (!platformId && portalId) {
        const portal = await getPortalById(portalId);
        platformId = portal?.platformId;
    }

    /*
     * Attachments are stored as JSON text.
     */
    const attachmentsJson =
        serializeAttachments(
            attachments
        );


    /*
     * IMPORTANT:
     *
     * Cassandra column:
     *
     * target_user_ids set<text>
     *
     * Therefore the driver should receive
     * a JavaScript Set, not an Array.
     */
    const targetUserIdsArray =
        targetAudience === "selected"
            ? [
                ...new Set(
                    Array.isArray(targetUserIds)
                        ? targetUserIds
                        : Array.from(targetUserIds || [])
                ),
            ]
            : [];
    

    const encryptedTitle =
            encrypt(
                title,
                {
                    platformId,
                    entity:"announcement",
                    field:"title",
                }
            );
    
    const encryptedContent =
            encrypt(
                content,
                {
                    platformId,
                    entity:"announcement",
                    field:"content",
                }
            );

    /*
     * Insert into both Cassandra tables.
     *
     * Both tables must receive the SAME
     * targetUserIdsSet.
     */
    await cassandra.batch(
        [
            {
                query: `
                    INSERT INTO announcements_by_id (
                        platform_id,
                        announcement_id,
                        portal_id,
                        sender_id,
                        title,
                        content,
                        attachments,
                        target_audience,
                        target_user_ids,
                        published_at,
                        expires_at,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    announcementId,
                    portalId,
                    senderId,
                    encryptedTitle,
                    encryptedContent,
                    attachmentsJson,
                    targetAudience,
                    targetUserIdsArray,
                    publishedAt,
                    expiresAt,
                    createdAt,
                    updatedAt,
                ],
            },

            {
                query: `
                    INSERT INTO announcements_by_portal (
                        platform_id,
                        portal_id,
                        published_at,
                        announcement_id,
                        sender_id,
                        title,
                        content,
                        attachments,
                        target_audience,
                        target_user_ids,
                        expires_at,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,

                params: [
                    platformId,
                    portalId,
                    publishedAt,
                    announcementId,
                    senderId,
                    encryptedTitle,
                    encryptedContent,
                    attachmentsJson,
                    targetAudience,
                    targetUserIdsArray,
                    expiresAt,
                    createdAt,
                    updatedAt,
                ],
            },
        ],
        {
            prepare: true,
        }
    );


    /*
     * Return a normal array to the API.
     */
    return {
        _id:
            announcementId,

        portalId,

        senderId,

        title,

        content,

        attachments,

        targetAudience,

        targetUserIds:
            targetUserIdsArray,

        publishedAt,

        expiresAt,

        createdAt,

        updatedAt,
    };
};


/* =====================================================
   GET ANNOUNCEMENT BY ID
===================================================== */

export const getAnnouncementById =
    async (
        announcementId,
        platformId
    ) => {

        if (platformId) {
            const result = await cassandra.execute(
                `
                    SELECT *
                    FROM announcements_by_id
                    WHERE platform_id = ?
                    AND announcement_id = ?
                `,
                [
                    platformId,
                    announcementId,
                ],
                {
                    prepare: true,
                }
            );
            return rowToAnnouncement(result.rows[0]);
        }

        const result =
            await cassandra.execute(
                `
                    SELECT *
                    FROM announcements_by_id
                    WHERE announcement_id = ?
                    ALLOW FILTERING
                `,
                [
                    announcementId,
                ],
                {
                    prepare: true,
                }
            );

        return rowToAnnouncement(
            result.rows[0]
        );
    };


/* =====================================================
   GET ANNOUNCEMENTS BY PORTAL
===================================================== */

export const getAnnouncementsByPortal =
    async (
        portalId,
        platformId
    ) => {
        if (platformId) {
            const result = await cassandra.execute(
                `
                    SELECT *
                    FROM announcements_by_portal
                    WHERE platform_id = ?
                    AND portal_id = ?
                `,
                [
                    platformId,
                    portalId,
                ],
                {
                    prepare: true,
                }
            );
            return result.rows.map(rowToAnnouncement);
        }

        const result =
            await cassandra.execute(
                `
                    SELECT *
                    FROM announcements_by_portal
                    WHERE portal_id = ?
                    ALLOW FILTERING
                `,
                [
                    portalId,
                ],
                {
                    prepare: true,
                }
            );

        return result.rows.map(
            rowToAnnouncement
        );
    };


/* =====================================================
   UPDATE ANNOUNCEMENT
===================================================== */

export const updateAnnouncement =
    async ({
        announcementId,
        portalId,
        platformId,
        title,
        content,
        targetAudience,
        expiresAt,
    }) => {

        const existing =
            await getAnnouncementById(
                announcementId,
                platformId
            );

        if (!existing) {
            return null;
        }

        let platId = platformId || existing.platformId;
        const updatedAt =
            new Date();


        const newTitle =
            title !== undefined
                ? title
                : existing.title;


        const newContent =
            content !== undefined
                ? content
                : existing.content;


        const newTargetAudience =
            targetAudience !==
                undefined
                ? targetAudience
                : existing.targetAudience;


        const newExpiresAt =
            expiresAt !== undefined
                ? expiresAt
                : existing.expiresAt;


        /*
         * Preserve existing selected users.
         */
        const existingTargetUserIds =
            new Set(
                existing.targetUserIds ||
                []
            );
        const encryptedNewTitle =
                encrypt(
                    newTitle,
                    {
                        platformId,
                        entity:"announcement",
                        field:"title",
                    }
                );
    
        const encryptedNewContent =
                encrypt(
                    newContent,
                    {
                        platformId,
                        entity:"announcement",
                        field:"content",
                    }
                );

        if (platId) {
            await cassandra.batch(
                [
                    {
                        query: `
                            UPDATE announcements_by_id
                            SET title = ?,
                                content = ?,
                                target_audience = ?,
                                expires_at = ?,
                                updated_at = ?
                            WHERE platform_id = ?
                            AND announcement_id = ?
                        `,

                        params: [
                            encryptedNewTitle,
                            encryptedNewContent,
                            newTargetAudience,
                            newExpiresAt,
                            updatedAt,
                            platId,
                            announcementId,
                        ],
                    },

                    {
                        query: `
                            UPDATE announcements_by_portal
                            SET title = ?,
                                content = ?,
                                target_audience = ?,
                                expires_at = ?,
                                updated_at = ?
                            WHERE platform_id = ?
                            AND portal_id = ?
                            AND published_at = ?
                            AND announcement_id = ?
                        `,

                        params: [
                            encryptedNewTitle,
                            encryptedNewContent,
                            newTargetAudience,
                            newExpiresAt,
                            updatedAt,
                            platId,
                            portalId,
                            existing.publishedAt,
                            announcementId,
                        ],
                    },
                ],
                {
                    prepare: true,
                }
            );
        } else {
            await cassandra.batch(
                [
                    {
                        query: `
                            UPDATE announcements_by_id
                            SET title = ?,
                                content = ?,
                                target_audience = ?,
                                expires_at = ?,
                                updated_at = ?
                            WHERE announcement_id = ?
                        `,

                        params: [
                            encryptedNewTitle,
                            encryptedNewContent,
                            newTargetAudience,
                            newExpiresAt,
                            updatedAt,
                            announcementId,
                        ],
                    },

                    {
                        query: `
                            UPDATE announcements_by_portal
                            SET title = ?,
                                content = ?,
                                target_audience = ?,
                                expires_at = ?,
                                updated_at = ?
                            WHERE portal_id = ?
                            AND published_at = ?
                            AND announcement_id = ?
                        `,

                        params: [
                            encryptedNewTitle,
                            encryptedNewContent,
                            newTargetAudience,
                            newExpiresAt,
                            updatedAt,
                            portalId,
                            existing.publishedAt,
                            announcementId,
                        ],
                    },
                ],
                {
                    prepare: true,
                }
            );
        }


        return {
            ...existing,

            title:
                newTitle,

            content:
                newContent,

            targetAudience:
                newTargetAudience,

            targetUserIds:
                Array.from(
                    existingTargetUserIds
                ),

            expiresAt:
                newExpiresAt,

            updatedAt,
        };
    };


/* =====================================================
   DELETE ANNOUNCEMENT
===================================================== */

export const deleteAnnouncement =
    async ({
        announcementId,
        portalId,
        platformId,
    }) => {

        const announcement =
            await getAnnouncementById(
                announcementId,
                platformId
            );

        if (!announcement) {
            return null;
        }

        let platId = platformId || announcement.platformId;

        if (platId) {
            await cassandra.batch(
                [
                    {
                        query: `
                            DELETE FROM announcements_by_id
                            WHERE platform_id = ?
                            AND announcement_id = ?
                        `,

                        params: [
                            platId,
                            announcementId,
                        ],
                    },

                    {
                        query: `
                            DELETE FROM announcements_by_portal
                            WHERE platform_id = ?
                            AND portal_id = ?
                            AND published_at = ?
                            AND announcement_id = ?
                        `,

                        params: [
                            platId,
                            portalId,
                            announcement.publishedAt,
                            announcementId,
                        ],
                    },
                ],
                {
                    prepare: true,
                }
            );
        } else {
            await cassandra.batch(
                [
                    {
                        query: `
                            DELETE FROM announcements_by_id
                            WHERE announcement_id = ?
                        `,

                        params: [
                            announcementId,
                        ],
                    },

                    {
                        query: `
                            DELETE FROM announcements_by_portal
                            WHERE portal_id = ?
                            AND published_at = ?
                            AND announcement_id = ?
                        `,

                        params: [
                            portalId,
                            announcement.publishedAt,
                            announcementId,
                        ],
                    },
                ],
                {
                    prepare: true,
                }
            );
        }


        return announcement;
    };
