import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "./config/db.js";
import cassandra, {
    connectCassandra
} from "./config/cassandra.js";
import AnnouncementPortal from "./models/AnnouncementPortal.js";
import AnnouncementPortalMember from "./models/AnnouncementPortalMember.js";
import Announcement from "./models/Announcement.js";

const toId = (id) => id.toString();

const serializeAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) {
        return null;
    }

    return JSON.stringify(
        attachments.map((attachment) => ({
            url: attachment.url,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            publicId: attachment.publicId,
            resourceType: attachment.resourceType,
        }))
    );
};

try {
    console.log(
        "Starting MongoDB → Cassandra announcement migration..."
    );

    await connectDB();
    await connectCassandra();

    // =====================================================
    // 1. PORTALS
    // =====================================================

    const portals =
        await AnnouncementPortal.find({}).lean();

    console.log(
        `Found ${portals.length} announcement portals`
    );

    for (const portal of portals) {
        const portalId = toId(portal._id);

        await cassandra.execute(
            `
                INSERT INTO announcement_portals_by_id (
                    portal_id,
                    name,
                    description,
                    created_by,
                    target_audience,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                portalId,
                portal.name,
                portal.description || "",
                portal.createdBy,
                portal.targetAudience || "all",
                portal.createdAt,
                portal.updatedAt,
            ],
            { prepare: true }
        );
    }

    console.log("Announcement portals migrated");


    // =====================================================
    // 2. PORTAL MEMBERS
    // =====================================================

    const members =
        await AnnouncementPortalMember.find({}).lean();

    console.log(
        `Found ${members.length} portal members`
    );

    for (const member of members) {
        const portalId =
            toId(member.portalId);

        const userId =
            member.userId;

        const memberParams = [
            userId,
            portalId,
            member.role,
            member.addedBy,
            member.createdAt,
            member.updatedAt,
        ];

        // By user
        await cassandra.execute(
            `
                INSERT INTO portal_members_by_user (
                    user_id,
                    portal_id,
                    role,
                    added_by,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            memberParams,
            { prepare: true }
        );

        // By portal
        await cassandra.execute(
            `
                INSERT INTO portal_members_by_portal (
                    portal_id,
                    user_id,
                    role,
                    added_by,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                portalId,
                userId,
                member.role,
                member.addedBy,
                member.createdAt,
                member.updatedAt,
            ],
            { prepare: true }
        );
    }

    console.log("Portal members migrated");


    // =====================================================
    // 3. ANNOUNCEMENTS
    // =====================================================

    const announcements =
        await Announcement.find({}).lean();

    console.log(
        `Found ${announcements.length} announcements`
    );

    for (const announcement of announcements) {
        const announcementId =
            toId(announcement._id);

        const portalId =
            toId(announcement.portalId);

        const targetAudience =
            announcement.targetAudience || "all";

        const targetUserIds =
            targetAudience === "selected"
                ? (announcement.targetUserIds || [])
                : [];

        const attachments =
            serializeAttachments(
                announcement.attachments
            );

        // By ID
        await cassandra.execute(
            `
                INSERT INTO announcements_by_id (
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                announcementId,
                portalId,
                announcement.senderId,
                announcement.title,
                announcement.content,
                attachments,
                targetAudience,
                targetUserIds,
                announcement.publishedAt,
                announcement.expiresAt || null,
                announcement.createdAt,
                announcement.updatedAt,
            ],
            { prepare: true }
        );

        // By portal
        await cassandra.execute(
            `
                INSERT INTO announcements_by_portal (
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                portalId,
                announcement.publishedAt,
                announcementId,
                announcement.senderId,
                announcement.title,
                announcement.content,
                attachments,
                targetAudience,
                targetUserIds,
                announcement.expiresAt || null,
                announcement.createdAt,
                announcement.updatedAt,
            ],
            { prepare: true }
        );
    }

    console.log("Announcements migrated");

    console.log(
        "MongoDB → Cassandra announcement migration completed successfully"
    );

} catch (error) {

    console.error(
        "Announcement migration failed:",
        error
    );

    process.exitCode = 1;

} finally {

    await mongoose.disconnect().catch(() => {});
}