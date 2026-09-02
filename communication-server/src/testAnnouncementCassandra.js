import {
    createPortal,
    getPortalById,
    addMember,
    getMember,
    getMembersByPortal,
    updateMemberRole,
    removeMember,
    createAnnouncement,
    getAnnouncementById,
    getAnnouncementsByPortal,
    updateAnnouncement,
    deleteAnnouncement,
} from "./repositories/announcementRepository.js";

import crypto from "crypto";

const portalId =
    crypto.randomBytes(12).toString("hex");

const announcementId =
    crypto.randomBytes(12).toString("hex");

const user1 = "cassandra-ann-user-1";
const user2 = "cassandra-ann-user-2";

try {

    console.log(
        "Portal ID:",
        portalId
    );

    console.log(
        "Announcement ID:",
        announcementId
    );


    // -----------------------------
    // Portal
    // -----------------------------

    const portal = await createPortal({
        portalId,
        name: "Cassandra Announcement Test",
        description: "Testing Cassandra",
        createdBy: user1,
        targetAudience: "selected",
    });

    console.log(
        "Created portal:",
        portal
    );


    const foundPortal =
        await getPortalById(portalId);

    console.log(
        "Found portal:",
        foundPortal
    );


    // -----------------------------
    // Members
    // -----------------------------

    await addMember({
        portalId,
        userId: user1,
        role: "host",
        addedBy: user1,
    });

    await addMember({
        portalId,
        userId: user2,
        role: "participant",
        addedBy: user1,
    });

    console.log(
        "Members:",
        await getMembersByPortal(portalId)
    );


    console.log(
        "User 2 membership:",
        await getMember({
            portalId,
            userId: user2,
        })
    );


    // -----------------------------
    // Announcement
    // -----------------------------

    const announcement =
        await createAnnouncement({
            announcementId,
            portalId,
            senderId: user1,
            title: "Cassandra Test",
            content: "Hello from Cassandra",
            targetAudience: "selected",
            targetUserIds: [user2],
        });

    console.log(
        "Created announcement:",
        announcement
    );


    console.log(
        "Announcement by ID:",
        await getAnnouncementById(
            announcementId
        )
    );


    console.log(
        "Announcements by portal:",
        await getAnnouncementsByPortal(
            portalId
        )
    );


    // -----------------------------
    // Update member
    // -----------------------------

    console.log(
        "Updated member:",
        await updateMemberRole({
            portalId,
            userId: user2,
            role: "participant",
        })
    );


    // -----------------------------
    // Update announcement
    // -----------------------------

    console.log(
        "Updated announcement:",
        await updateAnnouncement({
            announcementId,
            portalId,
            title: "Updated Cassandra Test",
            content: "Updated content",
        })
    );


    // -----------------------------
    // Delete announcement
    // -----------------------------

    console.log(
        "Deleted announcement:",
        await deleteAnnouncement({
            announcementId,
            portalId,
        })
    );


    // -----------------------------
    // Remove member
    // -----------------------------

    await removeMember({
        portalId,
        userId: user2,
    });

    console.log(
        "User 2 removed"
    );


    console.log(
        "Announcement Cassandra test completed"
    );

} catch (error) {

    console.error(
        "Announcement Cassandra test failed:",
        error
    );

    process.exitCode = 1;
}