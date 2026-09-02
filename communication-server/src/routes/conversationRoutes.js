import express from "express";
import { 
    createOrGetDirect,
    getUserConversations,
    createGroup
 } from "../controllers/conversationController.js";

const router = express.Router();

// router.post("/session", createOrGetSession);
router.post("/direct",createOrGetDirect);
router.get("/user/:userId", getUserConversations);
router.post("/group", createGroup);

export default router; 