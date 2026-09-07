
import express from "express";

import getMessages
    from "../controllers/messageController.js";


const router =
    express.Router();


/*
 * ---------------------------------------------------------
 * Platform Isolation Middleware
 * ---------------------------------------------------------
 *
 * Messages must never be fetched only using
 * conversationId.
 *
 * Example:
 *
 * GET /messages/conversation-123
 *     ?platformId=platform-A
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


    req.platformId =
        platformId;


    return next();
};


/*
 * ---------------------------------------------------------
 * Get Conversation Messages
 * ---------------------------------------------------------
 */

router.get(
    "/:conversationId",

    requirePlatform,

    getMessages
);


export default router;
