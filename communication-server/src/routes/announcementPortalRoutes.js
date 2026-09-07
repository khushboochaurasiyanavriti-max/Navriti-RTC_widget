import express from "express";

import upload from "../middleware/uploadMiddleware.js";

import {
    getPortalById,
} from "../repositories/announcementRepository.js";

import {
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
} from "../controllers/announcementPortalController.js";


const router = express.Router();


/*
 * ---------------------------------------------------------
 * Platform Isolation Middleware
 * ---------------------------------------------------------
 *
 * Every announcement portal request must contain platformId.
 *
 * For routes containing portalId, the portal is verified
 * before the request reaches the controller.
 * ---------------------------------------------------------
 */

const requirePlatform = async (
    req,
    res,
    next
) => {

    const platformId =
        req.body?.platformId ||
        req.query?.platformId;


    if (!platformId) {

        return res.status(400).json({
            message:
                "platformId is required",
        });

    }


    /*
     * Always store platformId.
     *
     * This is important even for:
     *
     * POST /
     * GET /
     *
     * because those routes don't contain portalId.
     */

    req.platformId =
        platformId;


    /*
     * Routes without portalId only need
     * platform validation.
     */

    if (!req.params.portalId) {

        return next();

    }


    try {

        const portal =
            await getPortalById(
                req.params.portalId
            );


        /*
         * Platform ownership validation.
         */

        if (
            !portal ||
            portal.platformId !==
                platformId
        ) {

            return res.status(404).json({
                message:
                    "Portal not found on this platform",
            });

        }


        /*
         * Store validated portal.
         *
         * Controllers can reuse this instead of
         * querying the portal again.
         */

        req.portal =
            portal;


        return next();

    } catch (error) {

        console.error(
            "Platform validation error:",
            error
        );


        return res.status(500).json({
            message:
                error.message,
        });

    }

};


/*
 * ---------------------------------------------------------
 * Apply platform validation to every route.
 * ---------------------------------------------------------
 */

router.use(
    requirePlatform
);


/*
 * ---------------------------------------------------------
 * Create Announcement Portal
 * ---------------------------------------------------------
 */

router.post(
    "/",
    createAnnouncementPortal
);


/*
 * ---------------------------------------------------------
 * Get User Announcement Portals
 * ---------------------------------------------------------
 */

router.get(
    "/",
    getUserAnnouncementPortals
);


/*
 * ---------------------------------------------------------
 * Portal Members
 * ---------------------------------------------------------
 */

router.post(
    "/:portalId/members",
    addPortalMembers
);


router.get(
    "/:portalId/members",
    getPortalMembers
);


router.delete(
    "/:portalId/members/:userId",
    removePortalMember
);


router.patch(
    "/:portalId/members/:userId/role",
    updatePortalMemberRole
);


/*
 * ---------------------------------------------------------
 * Delete Announcement Portal
 * ---------------------------------------------------------
 */

router.delete(
    "/:portalId",
    deleteAnnouncementPortal
);


/*
 * ---------------------------------------------------------
 * Create Announcement
 * ---------------------------------------------------------
 */

router.post(
    "/:portalId/announcements",
    upload.array(
        "attachments",
        10
    ),
    createAnnouncement
);


/*
 * ---------------------------------------------------------
 * Get Announcements
 * ---------------------------------------------------------
 */

router.get(
    "/:portalId/announcements",
    getAnnouncements
);


/*
 * ---------------------------------------------------------
 * Get Single Announcement
 * ---------------------------------------------------------
 */

router.get(
    "/:portalId/announcements/:announcementId",
    getAnnouncement
);


/*
 * ---------------------------------------------------------
 * Update Announcement
 * ---------------------------------------------------------
 */

router.patch(
    "/:portalId/announcements/:announcementId",
    updateAnnouncement
);


/*
 * ---------------------------------------------------------
 * Delete Announcement
 * ---------------------------------------------------------
 */

router.delete(
    "/:portalId/announcements/:announcementId",
    deleteAnnouncement
);


export default router;

