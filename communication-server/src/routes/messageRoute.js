import express from "express";
import getMessages  from "../controllers/messageController.js";

const router = express.Router();

router.get("/:conversationId", getMessages);

export default router;