import "dotenv/config";
import http from 'http';
import app from './app.js';
import dotenv from 'dotenv';

import  {connectCassandra } from "./config/cassandra.js";
import socketHandler from './socket/socketHandler.js';
import {Server} from "socket.io";
import {
    setAnnouncementSocket,
} from "./controllers/announcementPortalController.js";

dotenv.config();
const httpServer = http.createServer(app);


const io = new Server(httpServer,{
    cors:{
        origin: function(origin, callback) {
            // Allow all localhost origins for development
            if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

setAnnouncementSocket(io);
socketHandler(io);
await connectCassandra();

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



