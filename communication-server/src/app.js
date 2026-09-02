import express from 'express';
import cors from 'cors';

import messageRoutes from './routes/messageRoute.js';
import conversationRoutes from './routes/conversationRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import announcementPortalRoutes from "./routes/announcementPortalRoutes.js";

const app = express();
app.use(cors());
app.use((req, res, next) => {
    console.log("METHOD:", req.method);
    console.log("URL:", req.url);
    console.log("CONTENT-TYPE:", req.headers["content-type"]);
    next();
});

app.use(express.json());

app.use('/api/conversations', conversationRoutes);

app.use('/api/messages', messageRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/files", fileRoutes);

app.use(
  "/api/announcement-portals",
  announcementPortalRoutes
);
app.get('/', (req, res) => {
  res.send('Communication server is running');
});
export default app;