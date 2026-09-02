# Navriti RTC Widget

A reusable React communication widget with real-time messaging, conversation management, file sharing, screen-share signaling, announcement portals, and WebRTC signaling.

## Repository Structure

```text
Navriti-RTC_widget-main/
├── communication-server/       # Express + Socket.IO + Cassandra backend
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── repositories/
│       ├── routes/
│       ├── socket/
│       ├── app.js
│       └── server.js
├── widget/                     # Reusable embeddable React widget package
├── demo-host-app/              # Demo host application
├── widget-host-test/           # Widget integration test host
├── dashboard-host/             # Dashboard host application
├── ecommerce-host/             # E-commerce host application
├── ISSUES.md
└── Readme.md
```

---

# Prerequisites

Install and configure:

- Node.js
- npm
- Docker Desktop
- Apache Cassandra running through Docker
- Cloudinary account credentials for file upload functionality

---

# Installation

The repository contains multiple independent Node/Vite projects. Install dependencies in every project you plan to run.

## 1. Communication Server

```bash
cd communication-server
npm install
```

## 2. Communication Widget

```bash
cd widget
npm install
```

## 3. Demo Host App

```bash
cd demo-host-app
npm install
```

## 4. Widget Host Test

```bash
cd widget-host-test
npm install
```

## 5. Dashboard Host

```bash
cd dashboard-host
npm install
```

## 6. E-commerce Host

```bash
cd ecommerce-host
npm install
```

---

# Cassandra Setup

The communication server uses Cassandra repositories for persistent application data.

## Start the existing Cassandra container

```bash
docker start cassandra-dev
```

## Open Cassandra CQL shell

```bash
docker exec -it cassandra-dev cqlsh
```

## List available keyspaces

Inside `cqlsh`:

```sql
DESCRIBE KEYSPACES;
```

## Select the application keyspace

```sql
USE navriti;
```

## List tables

```sql
DESCRIBE TABLES;
```

## Inspect a table

```sql
DESCRIBE TABLE <table_name>;
```

## Exit Cassandra shell

```sql
exit
```

If the container is not running, verify its status:

```bash
docker ps -a
```

---

# Environment Configuration

Configure the environment values required by the communication server.

Example values used by the current Cassandra setup:

```env
PORT=5000

CASSANDRA_HOST=127.0.0.1
CASSANDRA_DATACENTER=datacenter1
CASSANDRA_KEYSPACE=navriti

CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
```

Cloudinary credentials are required for file upload and cleanup through the file API.

Do not commit real secrets to the repository.

---

# Running the Project

## Terminal 1 — Cassandra

Start Cassandra:

```bash
docker start cassandra-dev
```

Use `cqlsh` only when database inspection is required:

```bash
docker exec -it cassandra-dev cqlsh
```

---

## Terminal 2 — Communication Server

```bash
cd communication-server
npm run dev
```

Current development script:

```text
kill-port 5000 && nodemon src/server.js
```

This clears port `5000` and starts the server with Nodemon.

Run without Nodemon:

```bash
npm start
```

Current production/start command:

```text
node src/server.js
```

---

## Terminal 3 — Widget Development

```bash
cd widget
npm run dev
```

Build the widget:

```bash
npm run build
```

Preview the built widget:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

---

## Terminal 4 — Run One Host Application

Only the host application currently being tested needs to run.

### Demo Host App

```bash
cd demo-host-app
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Preview:

```bash
npm run preview
```

### Widget Host Test

```bash
cd widget-host-test
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Preview:

```bash
npm run preview
```

### Dashboard Host

```bash
cd dashboard-host
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Preview:

```bash
npm run preview
```

### E-commerce Host

```bash
cd ecommerce-host
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Preview:

```bash
npm run preview
```

---

# Communication Server

The backend is an Express application with Socket.IO for real-time application events and signaling.

Default local server base URL:

```text
http://localhost:5000
```

Health/root endpoint:

```http
GET /
```

Response:

```text
Communication server is running
```

---

# REST API Reference

## Conversations

Base path:

```text
/api/conversations
```

### Create or Get a Direct Conversation

```http
POST /api/conversations/direct
```

Handled by:

```text
createOrGetDirect
```

### Get User Conversations

```http
GET /api/conversations/user/:userId
```

Example:

```text
GET /api/conversations/user/user-123
```

Handled by:

```text
getUserConversations
```

### Create Group Conversation

```http
POST /api/conversations/group
```

Handled by:

```text
createGroup
```

---

## Messages

Base path:

```text
/api/messages
```

### Get Messages for a Conversation

```http
GET /api/messages/:conversationId
```

Example:

```text
GET /api/messages/conversation-123
```

Handled by:

```text
getMessages
```

Message creation, editing, and deletion are handled in real time through Socket.IO events.

---

## Files

Base path:

```text
/api/files
```

### Upload a File

```http
POST /api/files/upload
```

Request format:

```text
multipart/form-data
```

File field name:

```text
file
```

The uploaded file is processed through Cloudinary.

Successful responses include file metadata such as:

```text
originalName
fileName
fileType
fileSize
fileUrl
publicId
resourceType
```

### Delete Uploaded File

```http
DELETE /api/files/upload
```

Expected request body:

```json
{
  "publicId": "<cloudinary_public_id>",
  "resourceType": "image"
}
```

`resourceType` defaults to `image` when not provided.

---

# Announcement Portal API

Base path:

```text
/api/announcement-portals
```

## Create Announcement Portal

```http
POST /api/announcement-portals
```

Handled by:

```text
createAnnouncementPortal
```

## Get User Announcement Portals

```http
GET /api/announcement-portals
```

Handled by:

```text
getUserAnnouncementPortals
```

## Delete Announcement Portal

```http
DELETE /api/announcement-portals/:portalId
```

Handled by:

```text
deleteAnnouncementPortal
```

---

## Portal Members

### Add Members

```http
POST /api/announcement-portals/:portalId/members
```

Handled by:

```text
addPortalMembers
```

### Get Portal Members

```http
GET /api/announcement-portals/:portalId/members
```

Handled by:

```text
getPortalMembers
```

### Remove Portal Member

```http
DELETE /api/announcement-portals/:portalId/members/:userId
```

Handled by:

```text
removePortalMember
```

### Update Portal Member Role

```http
PATCH /api/announcement-portals/:portalId/members/:userId/role
```

Handled by:

```text
updatePortalMemberRole
```

---

## Announcements

### Create Announcement

```http
POST /api/announcement-portals/:portalId/announcements
```

The route supports attachments using:

```text
multipart/form-data
```

Attachment field:

```text
attachments
```

Maximum attachment count:

```text
10
```

Handled by:

```text
createAnnouncement
```

### Get Announcements

```http
GET /api/announcement-portals/:portalId/announcements
```

Handled by:

```text
getAnnouncements
```

### Get Single Announcement

```http
GET /api/announcement-portals/:portalId/announcements/:announcementId
```

Handled by:

```text
getAnnouncement
```

### Update Announcement

```http
PATCH /api/announcement-portals/:portalId/announcements/:announcementId
```

Handled by:

```text
updateAnnouncement
```

### Delete Announcement

```http
DELETE /api/announcement-portals/:portalId/announcements/:announcementId
```

Handled by:

```text
deleteAnnouncement
```

---

# Complete REST Endpoint Summary

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Server health/root response |
| POST | `/api/conversations/direct` | Create or get direct conversation |
| GET | `/api/conversations/user/:userId` | Get conversations for a user |
| POST | `/api/conversations/group` | Create group conversation |
| GET | `/api/messages/:conversationId` | Get conversation messages |
| POST | `/api/files/upload` | Upload file |
| DELETE | `/api/files/upload` | Delete uploaded file from Cloudinary |
| POST | `/api/announcement-portals` | Create announcement portal |
| GET | `/api/announcement-portals` | Get user announcement portals |
| DELETE | `/api/announcement-portals/:portalId` | Delete announcement portal |
| POST | `/api/announcement-portals/:portalId/members` | Add portal members |
| GET | `/api/announcement-portals/:portalId/members` | Get portal members |
| DELETE | `/api/announcement-portals/:portalId/members/:userId` | Remove portal member |
| PATCH | `/api/announcement-portals/:portalId/members/:userId/role` | Update member role |
| POST | `/api/announcement-portals/:portalId/announcements` | Create announcement |
| GET | `/api/announcement-portals/:portalId/announcements` | Get announcements |
| GET | `/api/announcement-portals/:portalId/announcements/:announcementId` | Get one announcement |
| PATCH | `/api/announcement-portals/:portalId/announcements/:announcementId` | Update announcement |
| DELETE | `/api/announcement-portals/:portalId/announcements/:announcementId` | Delete announcement |

---

# Socket.IO Real-Time Communication

The server uses Socket.IO for real-time application events and WebRTC signaling.

The widget client currently supports transport configuration in:

```text
widget/src/services/socket.js
```

Recommended WebSocket-first configuration:

```js
socket = io(serverUrl, {
    transports: ["websocket", "polling"],

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,

    timeout: 20000,
});
```

## Transport Strategy

```text
Client
   │
   ▼
Try WebSocket First
   │
   ├── Connected
   │      │
   │      ▼
   │  Real-time Socket.IO events
   │
   └── WebSocket unavailable
             │
             ▼
       HTTP Polling fallback
```

WebSocket is preferred for lower-latency real-time communication.

Polling remains available as a fallback when a direct WebSocket connection cannot be established.

The same Socket.IO connection can carry multiple independent application events concurrently.

---

# Socket.IO Client Events

The server currently listens for the following events.

## Announcement RTC

### Join Announcement RTC

```text
joinAnnouncementRTC
```

### Leave Announcement RTC

```text
leaveAnnouncementRTC
```

### WebRTC Offer

```text
announcement:offer
```

### WebRTC Answer

```text
announcement:answer
```

### ICE Candidate

```text
announcement:ice-candidate
```

---

## Screen Share Signaling

### Send Screen Share Offer

```text
screenShare:offer
```

### Send Screen Share Answer

```text
screenShare:answer
```

### Send Screen Share ICE Candidate

```text
screenShare:ice-candidate
```

### Screen Share Started

```text
screenShare:started
```

### Screen Share Stopped

```text
screenShare:stopped
```

---

## User and Conversation Rooms

### Join User Room

```text
joinUser
```

### Join Conversation Room

```text
joinConversation
```

### Leave Conversation Room

```text
leaveConversation
```

---

## Messaging

### Send Message

```text
sendMessage
```

### Edit Message

```text
editMessage
```

### Delete Message

```text
deleteMessage
```

---

## Connection Lifecycle

### Disconnect

```text
disconnect
```

---

# Socket.IO Events Emitted by the Server

The server emits or broadcasts real-time updates including:

```text
conversationUpdated
newMessage
messageUpdated
messageDeleted
```

Announcement and screen-sharing signaling events are also relayed to the relevant Socket.IO rooms.

---

# Concurrency Model

A single Socket.IO connection can handle multiple concurrent activities.

```text
One Socket.IO Connection
        │
        ├── Conversation events
        ├── Message events
        ├── File-sharing events
        ├── Screen-share signaling
        ├── Announcement RTC signaling
        └── Connection lifecycle events
```

The application does not need one separate socket per feature.

Instead, features are separated by event names and Socket.IO rooms.

---

# Socket.IO and WebRTC

Socket.IO is used for:

- Application-level real-time events
- Message events
- Conversation events
- Screen-sharing signaling
- Announcement RTC signaling
- WebRTC offer/answer exchange
- ICE candidate exchange

WebRTC is used for media/data connections such as real-time RTC streams.

The Socket.IO server is therefore primarily responsible for signaling and application event delivery rather than carrying RTC media streams.

---

# Reconnection

The current client configuration enables automatic reconnection:

```js
reconnection: true,
reconnectionAttempts: Infinity,
reconnectionDelay: 1000,
reconnectionDelayMax: 5000,
```

A reconnect can establish a new underlying socket connection.

For reliable concurrent activity handling, active application state should be restored after reconnect where required, including:

```text
User room
Conversation room
Announcement RTC room
Other active feature-specific rooms
```

Recommended reconnection flow:

```text
Network interruption
        │
        ▼
Socket disconnect
        │
        ▼
Automatic reconnection
        │
        ▼
Connection restored
        │
        ├── Rejoin user room
        ├── Rejoin active conversation rooms
        ├── Restore active RTC/signaling rooms
        └── Resume real-time activity
```

---

# Cassandra Utilities in the Repository

The communication server currently includes migration and database testing utilities:

```text
src/migrateMongoToCassandra.js
src/migrateAnnouncementsMongoToCassandra.js
src/testCassandra.js
src/testMessageCassandra.js
src/testAnnouncementCassandra.js
```

These files are repository utilities and are separate from the normal development command:

```bash
npm run dev
```

Review the source and configuration before manually running migration or test utility files.

---

# Widget Package Commands

Inside `widget/`:

## Start development

```bash
npm run dev
```

## Build distributable package

```bash
npm run build
```

## Preview build

```bash
npm run preview
```

## Lint source

```bash
npm run lint
```

The widget package exposes:

```text
.
./style.css
```

The built package output is:

```text
dist/
```

---

# Host Application Commands

Each host application currently supports the following scripts:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Host applications:

```text
demo-host-app
widget-host-test
dashboard-host
ecommerce-host
```

---

# Git Workflow

## Check current status

```bash
git status
```

## Check current branch

```bash
git branch
```

## Pull latest changes

```bash
git pull origin main
```

## Add all changes

```bash
git add .
```

## Add only documentation files

```bash
git add Readme.md ISSUES.md
```

## Commit

```bash
git commit -m "Update project documentation"
```

## Push

```bash
git push origin main
```

## View recent commits

```bash
git log --oneline -5
```

## View remote repository

```bash
git remote -v
```

---

# Recommended Development Workflow

Use separate terminals:

## Terminal 1

```bash
docker start cassandra-dev
```

## Terminal 2

```bash
cd communication-server
npm run dev
```

## Terminal 3

```bash
cd widget
npm run dev
```

## Terminal 4

Run the host application currently being used for testing:

```bash
cd widget-host-test
npm run dev
```

Other host applications do not need to run simultaneously unless they are specifically being tested.

---

# Current Architecture

```text
Host Application
       │
       ▼
Reusable React Communication Widget
       │
       ├── REST API requests
       │
       └── Socket.IO real-time events
                 │
                 ▼
       Express + Socket.IO Server
                 │
                 ├── Cassandra repositories
                 │
                 └── Cloudinary file storage
```

The architecture separates:

- UI and embeddable widget functionality
- REST-based data retrieval and management
- Real-time Socket.IO communication
- WebRTC signaling
- Cassandra persistence
- Cloudinary file storage

---

# Documentation Notes

- Replace placeholder environment values with local credentials.
- Do not commit Cloudinary secrets.
- Confirm local Cassandra keyspace and Docker container names before changing database commands.
- Keep `ISSUES.md` limited to unresolved technical issues and follow-up work.
