import express from "express";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

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


router.post(
    "/:portalId/members",
    addPortalMembers
);

router.delete(
    "/:portalId/members/:userId",
    removePortalMember
);

router.patch(
    "/:portalId/members/:userId/role",
    updatePortalMemberRole
);

router.delete(
    "/:portalId",
    deleteAnnouncementPortal
);

router.get(
    "/:portalId/members",
    getPortalMembers
);
router.post(
  "/",
  createAnnouncementPortal
);
router.get(
    "/",
    getUserAnnouncementPortals
);

router.post(
  "/:portalId/members",
  addPortalMembers
);

router.post(
  "/:portalId/announcements",
  upload.array("attachments", 10),
  createAnnouncement
);
router.get(
  "/:portalId/announcements",
  getAnnouncements
);

router.get(
  "/:portalId/announcements/:announcementId",
  getAnnouncement
);

router.patch(
  "/:portalId/announcements/:announcementId",
  updateAnnouncement
);

router.delete(
  "/:portalId/announcements/:announcementId",
  deleteAnnouncement
);
export default router;