# Navriti RTC Widget

A reusable, embeddable React communication widget featuring real-time 1-on-1 and group chat, file sharing with Cloudinary integration, WebRTC screen sharing, announcement portals, and multi-tenant platform isolation.

---

## 🏗️ Repository Architecture

```text
NAVRITI_RTC_WIDGET/
├── communication-server/       # Express + Socket.IO + Cassandra backend
│   └── src/
│       ├── config/             # Cassandra & Cloudinary connections
│       ├── controllers/        # Express controllers (Conversations, Messages, Portals, Files)
│       ├── middleware/         # Platform validation & Multer upload middleware
│       ├── repositories/       # Cassandra data access layer (Partitioned by platform_id)
│       ├── routes/             # REST route definitions
│       ├── socket/             # Socket.IO handlers & WebRTC signaling
│       ├── app.js              # Express application setup
│       └── server.js           # HTTP server startup & Socket.IO server initialization
├── widget/                     # Reusable embeddable React widget package (@rtc-widget/react)
├── demo-host-app/              # Host application 1 (platformId: "platform-test1")
├── dashboard-host/             # Host application 2 (platformId: "platform-test1")
├── ecommerce-host/             # Host application 3 (platformId: "ecommerce-platform")
├── widget-host-test/           # Integration test host (platformId: "platform-test2")
├── Navriti_RTC_Widget_ISSUES.md# Technical issue tracker & resolution log
└── README.md                   # Primary system documentation
```

---

## ⚡ Prerequisites

- **Node.js** (v18+)
- **npm** (v9+)
- **Docker Desktop**
- **Apache Cassandra** (running via Docker)
- **Cloudinary Account** (for file attachments and image storage)

---

## 💾 Cassandra Database Setup

The backend uses Apache Cassandra for high-scale persistent storage. All core tables enforce **Platform Isolation** using `platform_id` as part of their primary/partition keys.

### 1. Start Cassandra Container

```bash
docker start cassandra-dev
```

### 2. Verify Container Status

```bash
docker ps
```

### 3. Open Cassandra CQL Shell

```bash
docker exec -it cassandra-dev cqlsh
```

### 4. Cassandra Schema (`navriti` Keyspace)

```sql
CREATE KEYSPACE IF NOT EXISTS navriti 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'};

USE navriti;

-- Conversations by ID
CREATE TABLE IF NOT EXISTS conversations_by_id (
    platform_id text,
    conversation_id text,
    is_group boolean,
    name text,
    created_by text,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY (platform_id, conversation_id)
);

-- Participants by User
CREATE TABLE IF NOT EXISTS participants_by_user_v2 (
    platform_id text,
    user_id text,
    conversation_id text,
    joined_at timestamp,
    PRIMARY KEY ((platform_id, user_id), conversation_id)
);

-- Participants by Conversation
CREATE TABLE IF NOT EXISTS participants_by_conversation_v2 (
    platform_id text,
    conversation_id text,
    user_id text,
    joined_at timestamp,
    PRIMARY KEY ((platform_id, conversation_id), user_id)
);

-- Messages by Conversation
CREATE TABLE IF NOT EXISTS messages_by_conversation (
    platform_id text,
    conversation_id text,
    created_at timestamp,
    message_id text,
    sender_id text,
    content text,
    attachments text,
    edited boolean,
    deleted boolean,
    mentions set<text>,
    PRIMARY KEY ((platform_id, conversation_id), created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at DESC, message_id ASC);

-- Messages by ID
CREATE TABLE IF NOT EXISTS messages_by_id (
    platform_id text,
    message_id text,
    conversation_id text,
    sender_id text,
    content text,
    attachments text,
    edited boolean,
    deleted boolean,
    mentions set<text>,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY ((platform_id, message_id))
);

-- Announcement Portals by ID
CREATE TABLE IF NOT EXISTS announcement_portals_by_id (
    platform_id text,
    portal_id text,
    name text,
    description text,
    created_by text,
    target_audience text,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY (platform_id, portal_id)
);

-- Portal Members by User
CREATE TABLE IF NOT EXISTS portal_members_by_user (
    platform_id text,
    user_id text,
    portal_id text,
    role text,
    added_by text,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY ((platform_id, user_id), portal_id)
);

-- Portal Members by Portal
CREATE TABLE IF NOT EXISTS portal_members_by_portal (
    platform_id text,
    portal_id text,
    user_id text,
    role text,
    added_by text,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY ((platform_id, portal_id), user_id)
);

-- Announcements by ID
CREATE TABLE IF NOT EXISTS announcements_by_id (
    platform_id text,
    announcement_id text,
    portal_id text,
    sender_id text,
    title text,
    content text,
    attachments text,
    target_audience text,
    target_user_ids set<text>,
    published_at timestamp,
    expires_at timestamp,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY ((platform_id, announcement_id))
);

-- Announcements by Portal
CREATE TABLE IF NOT EXISTS announcements_by_portal (
    platform_id text,
    portal_id text,
    published_at timestamp,
    announcement_id text,
    sender_id text,
    title text,
    content text,
    attachments text,
    target_audience text,
    target_user_ids set<text>,
    expires_at timestamp,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY ((platform_id, portal_id), published_at, announcement_id)
) WITH CLUSTERING ORDER BY (published_at DESC, announcement_id ASC);
```

---

## ⚙️ Environment Variables

Create `.env` inside `communication-server/`:

```env
PORT=5000

CASSANDRA_HOST=127.0.0.1
CASSANDRA_DATACENTER=datacenter1
CASSANDRA_KEYSPACE=navriti

CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
CLOUDINARY_API_KEY=<your_cloudinary_api_key>
CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>
```

---

## 🚀 Running the Applications

### 1. Communication Server (Backend)

```bash
cd communication-server
npm install
npm run dev     # Starts server with port clearing & nodemon on port 5000
```

### 2. Communication Widget Package

```bash
cd widget
npm install
npm run build   # Builds library into dist/ (Vite library mode)
```

### 3. Running Host Applications

Launch any of the sample host applications to test widget integration:

```bash
# Demo Host App (port 5173 / default Vite port)
cd demo-host-app && npm install && npm run dev

# Dashboard Host App
cd dashboard-host && npm install && npm run dev

# E-Commerce Host App
cd ecommerce-host && npm install && npm run dev

# Widget Host Integration Test Sandbox
cd widget-host-test && npm install && npm run dev
```

---

## 🔒 Platform Isolation (`platformId`)

The system enforces strict multi-tenant isolation:
- Every HTTP API request requires `platformId` (via query string or body).
- Every Socket room is platform-scoped (`userRoom(platformId, userId)`, `announcementRoom(platformId, portalId)`).
- Applications with matching `platformId` (e.g. `demo-host-app` and `dashboard-host` both using `platform-test1`) can communicate seamlessly.
- Applications with different `platformId` values (e.g. `ecommerce-host` using `ecommerce-platform`) remain strictly isolated.

---

## 📡 REST API Reference

### Health Check
- `GET /` — Server status message.

### Conversations
- `POST /api/conversations/direct` — Get or create a 1-on-1 direct conversation (`userId1`, `userId2`, `platformId`).
- `POST /api/conversations/group` — Create a group conversation (`name`, `createdBy`, `members`, `platformId`).
- `GET /api/conversations/user/:userId?platformId=...` — List conversations for a user.

### Messages
- `GET /api/messages/:conversationId?platformId=...&userId=...` — Retrieve messages for a conversation.

### File Uploads
- `POST /api/files/upload` — Upload file attachment to Cloudinary (`multipart/form-data`).
- `DELETE /api/files/upload` — Delete Cloudinary attachment (`publicId`, `resourceType`).

### Announcement Portals
- `POST /api/announcement-portals` — Create announcement portal (`name`, `description`, `userId`, `role`, `targetAudience`, `members`, `platformId`).
- `GET /api/announcement-portals?userId=...&platformId=...` — Fetch portals available to user.
- `DELETE /api/announcement-portals/:portalId` — Delete announcement portal (`userId`, `platformId`).

### Portal Members
- `GET /api/announcement-portals/:portalId/members?userId=...&platformId=...` — Fetch portal members.
- `POST /api/announcement-portals/:portalId/members` — Add members (`hostUserId`, `members`, `platformId`).
- `PATCH /api/announcement-portals/:portalId/members/:userId/role` — Update member role (`hostUserId`, `role`, `platformId`).
- `DELETE /api/announcement-portals/:portalId/members/:userId` — Remove member (`hostUserId`, `platformId`).

### Announcements
- `POST /api/announcement-portals/:portalId/announcements?platformId=...` — Create announcement (`senderId`, `title`, `content`, `targetAudience`, `targetUserIds`, `attachments`).
- `GET /api/announcement-portals/:portalId/announcements?userId=...&platformId=...` — Get announcements visible to user.
- `GET /api/announcement-portals/:portalId/announcements/:announcementId?userId=...&platformId=...` — Get single announcement.
- `PATCH /api/announcement-portals/:portalId/announcements/:announcementId` — Update announcement (`userId`, `title`, `content`, `platformId`).
- `DELETE /api/announcement-portals/:portalId/announcements/:announcementId` — Delete announcement (`userId`, `platformId`).

---

## ⚡ Socket.IO Real-Time & WebRTC Events

| Event Category | Socket Event | Description |
| :--- | :--- | :--- |
| **Session** | `user:join` | Register user socket room |
| **Conversations** | `conversation:created` | Broadcast new conversation |
| **Messaging** | `message:send`, `message:new`, `message:edit`, `message:edited`, `message:delete`, `message:deleted` | Real-time chat & edits |
| **Announcements** | `announcement:created`, `announcement:updated`, `announcement:deleted`, `announcement:member-role-updated`, `announcement:member-removed` | Portal real-time events |
| **Announcement RTC** | `joinAnnouncementRTC`, `leaveAnnouncementRTC`, `announcement:offer`, `announcement:answer`, `announcement:ice-candidate` | WebRTC audio/video in portal |
| **Screen Sharing** | `screenshare:start`, `screenshare:stop`, `screenshare:offer`, `screenshare:answer`, `screenshare:ice-candidate` | WebRTC screen-share signaling |

---

## 🛡️ License

Private repository — Navriti RTC Widget. All rights reserved.
