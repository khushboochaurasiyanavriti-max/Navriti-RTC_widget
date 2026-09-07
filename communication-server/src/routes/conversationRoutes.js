
import express from "express";

import {
    createOrGetDirect,
    getUserConversations,
    createGroup,
} from "../controllers/conversationController.js";


const router =
    express.Router();


/*
 * ---------------------------------------------------------
 * Platform Isolation Middleware
 * ---------------------------------------------------------
 *
 * Every conversation request must contain platformId.
 *
 * GET requests:
 *
 * ?platformId=platform-A
 *
 * POST requests:
 *
 * {
 *     platformId: "platform-A"
 * }
 * ---------------------------------------------------------
 */

const requirePlatform = (
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
     * Controllers should use req.platformId
     * instead of trusting values again from
     * req.body.
     */

    req.platformId =
        platformId;


    return next();
};


/*
 * ---------------------------------------------------------
 * Apply platform validation to all conversation routes.
 * ---------------------------------------------------------
 */

router.use(
    requirePlatform
);


/*
 * ---------------------------------------------------------
 * Create or Get Direct Conversation
 * ---------------------------------------------------------
 */

router.post(
    "/direct",
    createOrGetDirect
);


/*
 * ---------------------------------------------------------
 * Get User Conversations
 * ---------------------------------------------------------
 *
 * Example:
 *
 * GET /conversation/user/user-1
 *     ?platformId=platform-A
 */

router.get(
    "/user/:userId",
    getUserConversations
);


/*
 * ---------------------------------------------------------
 * Create Group Conversation
 * ---------------------------------------------------------
 */

router.post(
    "/group",
    createGroup
);


export default router;
