
# Real-Time Communication Widget

A reusable real-time communication/chat widget that can be integrated into host applications.

The widget provides one-to-one conversations, group conversations, real-time messaging, message editing/deletion, mentions, file sharing, image previews, and persistent conversation history.

---

# Architecture

```text
                         Host Application
                                │
                                │
                         Authentication
                         User Identity
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   Communication Widget  │
                  │                         │
                  │  Conversation List      │
                  │  Chat Window            │
                  │  Message List            │
                  │  Chat Input              │
                  │  File Sharing            │
                  │  Mentions                │
                  └────────────┬────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                 REST API              Socket.IO
                    │                     │
        ┌───────────┼──────────┐          │
        │           │          │          │
     Direct       Group     History       │
      Chat         Chat     Messages      │
        │           │          │          │
        └───────────┴──────────┴──────────┘
                    │                     │
                    └──────────┬──────────┘
                               │
                          MongoDB
                               │
                               │
                         File Metadata
                               │
                               ▼
                           Cloudinary
````

---

# Communication Server

The communication server is responsible for:

* Conversation management
* Participant management
* Message persistence
* Real-time communication
* Message editing
* Message deletion
* Mentions
* File upload handling
* File metadata persistence
* Cloudinary file storage

---

# REST API

REST APIs are used for operations that require persistent data retrieval or creation.

## Direct Conversations

### Create/Get Direct Conversation

```http
POST /api/conversations/direct
```

Creates a direct conversation between two users or returns the existing conversation.

Example request:

```json
{
    "currentUserId": "user-12",
    "targetUserId": "user-13"
}
```

The conversation uses a unique participant key:

```text
user-12:user-13
```

This prevents duplicate direct conversations.

---

## Group Conversations

### Create Group

```http
POST /api/conversations/group
```

Example request:

```json
{
    "groupName": "Development Team",
    "currentUserId": "user-12",
    "participants": [
        "user-13",
        "user-14"
    ]
}
```

The creator is automatically included as a participant.

Duplicate participants are removed before creation.

---

## User Conversations

### Get User Conversations

```http
GET /api/conversations/user/:userId
```

Returns all conversations belonging to the user.

The response contains:

```json
{
    "conversationId": "...",
    "type": "direct",
    "displayName": "user-13",
    "participants": [
        "user-12",
        "user-13"
    ],
    "lastMessage": "Hello",
    "lastMessageTime": "..."
}
```

For file messages, the conversation preview displays:

```text
📎 filename.pdf
```

Conversations are sorted by latest message.

---

## Message History

### Get Conversation Messages

```http
GET /api/messages/:conversationId
```

Returns the persistent message history for a conversation.

---

# File Sharing

The widget supports file sharing through Cloudinary.

## Supported Files

### Images

```text
JPEG
PNG
WEBP
```

### Documents

```text
PDF
TXT
DOC
DOCX
```

### Excel

```text
XLS
XLSX
```

### Archives

```text
ZIP
```

Maximum file size:

```text
20 MB
```

---

# File Upload Flow

```text
User selects file
        │
        ▼
Frontend validation
        │
        ▼
POST /api/files/upload
        │
        ▼
Multer memoryStorage
        │
        ▼
File buffer
        │
        ▼
Cloudinary
        │
        ├── secure_url
        ├── public_id
        └── resource_type
        │
        ▼
Frontend receives metadata
        │
        ▼
Socket.IO sendMessage
        │
        ▼
MongoDB Message
        │
        ▼
All users receive newMessage
```

Files themselves are stored in Cloudinary.

MongoDB stores only the file metadata.

---

# File Metadata

File messages contain an attachment object:

```js
attachment: {
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    publicId: String,
    resourceType: String
}
```

Example:

```json
{
    "messageType": "file",
    "content": "",
    "attachment": {
        "fileName": "interview_prep.pdf",
        "fileUrl": "https://res.cloudinary.com/...",
        "fileType": "application/pdf",
        "fileSize": 245678,
        "publicId": "communication-widget/abc123",
        "resourceType": "image"
    }
}
```

---

# File Display

## Images

Images are displayed directly inside the chat:

```text
┌──────────────────────┐
│                      │
│      IMAGE PREVIEW   │
│                      │
└──────────────────────┘
filename.png

12.4 KB
```

Clicking the image opens the Cloudinary URL.

---

## Other Files

Non-image files display:

```text
📎 interview_prep.pdf
1.2 MB

Open    Download
```

---

# File Deletion

Files are deleted from Cloudinary when the corresponding file message is deleted.

```text
Delete message
      │
      ▼
Find MongoDB message
      │
      ▼
Check messageType === "file"
      │
      ▼
Cloudinary destroy(publicId, resourceType)
      │
      ▼
Mark MongoDB message as deleted
      │
      ▼
Emit messageDeleted
      │
      ▼
Update UI
```

Messages use soft deletion.

The message remains in MongoDB with:

```js
isDeleted: true
```

The UI displays:

```text
Message deleted
```

---

# Socket.IO

Socket.IO is responsible for real-time communication.

---

## Connection

Clients connect to the communication server using Socket.IO.

Each connected client receives a unique socket ID.

---

# User Room

Users can join a personal room:

```js
socket.emit("joinUser", userId);
```

The server creates:

```text
user:<userId>
```

This can be used later for:

* Notifications
* Online status
* Read receipts
* User-specific events

---

# Conversation Room

When a user opens a conversation:

```js
socket.emit(
    "joinConversation",
    conversationId
);
```

The socket joins the conversation room:

```text
conversationId
```

All messages for that conversation are broadcast to the room.

---

# Send Message

Client:

```js
socket.emit("sendMessage", {
    conversationId,
    senderId,
    content,
    messageType: "text"
});
```

Server:

```text
sendMessage
     │
     ▼
MongoDB Message.create()
     │
     ▼
io.to(conversationId)
  .emit("newMessage")
```

---

# File Message

File messages use the same Socket.IO message flow.

Example:

```js
socket.emit("sendMessage", {
    conversationId,
    senderId,
    content: "",
    messageType: "file",
    attachment: {
        fileName,
        fileUrl,
        fileType,
        fileSize,
        publicId,
        resourceType
    }
});
```

---

# New Message Event

Clients listen for:

```js
socket.on(
    "newMessage",
    handleNewMessage
);
```

The event is used to:

* Add the message to the current conversation
* Update the conversation preview
* Move the conversation to the top
* Trigger mention notifications
* Update the UI in real time

---

# Edit Message

Client:

```js
socket.emit("editMessage", {
    messageId,
    senderId,
    content
});
```

Server updates the message and emits:

```js
messageUpdated
```

Clients listen for:

```js
socket.on(
    "messageUpdated",
    handleMessageUpdated
);
```

Only text messages can be edited.

File messages do not expose the Edit action.

---

# Delete Message

Client:

```js
socket.emit("deleteMessage", {
    messageId,
    senderId
});
```

Server:

```text
Find message
    │
    ├── File?
    │     │
    │     └── Delete Cloudinary asset
    │
    ▼
isDeleted = true
    │
    ▼
messageDeleted
```

Clients receive:

```js
socket.on(
    "messageDeleted",
    handleMessageDeleted
);
```

---

# Leave Conversation

When a user changes conversations:

```js
socket.emit(
    "leaveConversation",
    conversationId
);
```

The socket leaves the previous conversation room.

This prevents unnecessary message events from being processed for conversations that are no longer open.

---

# Mentions

The widget supports user mentions.

Example:

```text
@John Can you check this?
```

When the user types:

```text
@
```

the widget displays matching conversation participants.

Only participants of the current conversation are shown.

The current user is excluded from the mention list.

---

# Mention Notifications

When a message contains the current user's display name:

```text
@Khushboo please check this
```

the widget detects the mention and marks the conversation as mentioned.

The mention badge is removed when the conversation is opened.

Mentions are also checked for edited messages.

---

# Message Model

```text
Message
├── conversationId
├── senderId
├── content
├── messageType
├── attachment
│   ├── fileName
│   ├── fileUrl
│   ├── fileType
│   ├── fileSize
│   ├── publicId
│   └── resourceType
├── status
├── isDeleted
└── timestamps
```

---

# Message Types

Currently supported:

```text
text
image
file
voice
```

Current implementation primarily uses:

```text
text
file
```

The schema is prepared for:

```text
image
voice
```

---

# Message Status

Messages support:

```text
sent
delivered
read
```

Currently the primary implemented state is:

```text
sent
```

Future real-time delivery/read handling can extend this.

---

# Database Models

## Conversation

```text
Conversation
├── type
├── displayName
├── participantKey
└── timestamps
```

### Type

```text
direct
group
```

### Unique Participant Key

Direct conversations use:

```text
participantKey
```

which is unique.

This prevents multiple conversations from being created for the same pair of users.

---

# Participant

```text
Participant
├── userId
├── conversationId
├── joinedAt
└── unique index
```

Unique constraint:

```text
conversationId + userId
```

This prevents the same user from being added multiple times to the same conversation.

Additional index:

```text
userId
```

This makes finding all conversations belonging to a user efficient.

---

# Message Index

Messages use:

```js
{
    conversationId: 1,
    createdAt: 1
}
```

This supports efficient conversation message retrieval and chronological ordering.

---

# Persistence

MongoDB currently stores:

```text
Conversation
Participant
Message
```

Cloudinary stores:

```text
Actual uploaded files
```

MongoDB stores Cloudinary metadata:

```text
secure_url
public_id
resource_type
filename
file type
file size
```

---

# Current Storage Architecture

```text
                  Communication Server
                          │
             ┌────────────┴────────────┐
             │                         │
          MongoDB                  Cloudinary
             │                         │
             │                         │
       Conversations             Actual Files
       Participants              Images
       Messages                  PDFs
       File Metadata             Documents
                                 Excel
                                 ZIP
```

---

# Host Application

The host application is responsible for:

* Authentication
* User identity
* Providing the current user
* Providing available users
* Providing the communication server URL

The communication widget does not own the application's authentication system.

The widget receives user information from the host application.

Example:

```js
<WidgetContainer
    currentUser={currentUser}
    users={users}
    serverUrl={serverUrl}
/>
```

---

# Frontend Structure

```text
src/
│
├── components/
│   ├── WidgetContainer/
│   ├── ConversationList/
│   ├── ConversationItem/
│   ├── ChatWindow/
│   ├── MessageList/
│   ├── MessageItem/
│   ├── ChatInput/
│   ├── NewChatModal/
│   └── NewGroupModal/
│
├── services/
│   ├── api.js
│   ├── config.js
│   ├── socket.js
│   ├── messageService.js
│   └── conversationService.js
│
└── ...
```

---

# Backend Structure

```text
communication-server/
│
├── src/
│   ├── config/
│   │   └── cloudinary.js
│   │
│   ├── middleware/
│   │   └── uploadMiddleware.js
│   │
│   ├── models/
│   │   ├── conversation.js
│   │   ├── participant.js
│   │   └── message.js
│   │
│   ├── routes/
│   │   ├── conversationRoutes.js
│   │   ├── messageRoute.js
│   │   └── fileRoutes.js
│   │
│   ├── socket/
│   │   └── socketHandler.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── .gitignore
└── package.json
```

---

# Environment Variables

The communication server requires:

```env
MONGODB_URI=your_mongodb_connection_string

PORT=5000

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Never commit `.env` to GitHub.

---

# Running the Communication Server

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

The server runs on:

```text
http://localhost:5000
```

---

# API Summary

| Method | Endpoint                          | Purpose                        |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/api/conversations/direct`       | Create/get direct conversation |
| POST   | `/api/conversations/group`        | Create group                   |
| GET    | `/api/conversations/user/:userId` | Get user's conversations       |
| GET    | `/api/messages/:conversationId`   | Get message history            |
| POST   | `/api/files/upload`               | Upload file to Cloudinary      |

---

# Socket Event Summary

| Event               | Direction       | Purpose                   |
| ------------------- | --------------- | ------------------------- |
| `joinUser`          | Client → Server | Join personal user room   |
| `joinConversation`  | Client → Server | Join conversation room    |
| `leaveConversation` | Client → Server | Leave conversation room   |
| `sendMessage`       | Client → Server | Send text/file message    |
| `newMessage`        | Server → Client | Broadcast new message     |
| `editMessage`       | Client → Server | Edit text message         |
| `messageUpdated`    | Server → Client | Broadcast edited message  |
| `deleteMessage`     | Client → Server | Delete message            |
| `messageDeleted`    | Server → Client | Broadcast deleted message |

---

# Current Features

* [x] One-to-one conversations
* [x] Group conversations
* [x] Conversation participant management
* [x] Persistent message history
* [x] Real-time messaging
* [x] Socket.IO conversation rooms
* [x] Message editing
* [x] Message deletion
* [x] Soft deleted messages
* [x] User mentions
* [x] Mention notifications/badges
* [x] File sharing
* [x] Image preview
* [x] PDF support
* [x] Word document support
* [x] Excel support
* [x] ZIP support
* [x] TXT support
* [x] 20 MB file limit
* [x] Cloudinary file storage
* [x] Cloudinary file deletion
* [x] Persistent file metadata
* [x] Persistent conversation last-message preview
* [x] Open/download files
* [x] Responsive/mobile conversation UI

---

# Planned Features

## Real-Time Features

* [ ] Typing indicator
* [ ] Read receipts
* [ ] Delivered status
* [ ] Online/offline status
* [ ] Last seen
* [ ] Unread message count

## File Features

* [ ] Upload progress
* [ ] Better file type icons
* [ ] File upload cancellation
* [ ] File preview for additional formats
* [ ] Improved upload error handling

## Scalability

Current:

```text
MongoDB
    +
Cloudinary
```

Planned:

```text
Cassandra
    +
Cloudinary
```

MongoDB is currently used for persistent conversation and message state.

As the communication system scales, conversation/message storage can be migrated to Cassandra while keeping Cloudinary as the file-storage layer.

The frontend and Socket.IO message contract should remain largely unchanged during this migration.

---

# Future Scalable Architecture

```text
                         Host Application
                                │
                         Authentication
                                │
                                ▼
                    Communication Widget
                                │
                    ┌───────────┴───────────┐
                    │                       │
                 REST API               Socket.IO
                    │                       │
                    └───────────┬───────────┘
                                │
                       Communication Server
                                │
                    ┌───────────┴───────────┐
                    │                       │
                Cassandra               Cloudinary
                    │                       │
             Conversations              Files
             Participants               Images
             Messages                   Documents
```

---

# Design Principles

## Separation of Responsibilities

The architecture separates:

```text
Host Application
    ↓
Authentication / Identity

Communication Server
    ↓
Conversation / Messaging

MongoDB / Cassandra
    ↓
Persistent message state

Cloudinary
    ↓
File storage

Socket.IO
    ↓
Real-time communication
```

This allows each component to evolve independently.

---

# Concurrency Considerations

Direct conversation creation uses a unique:

```text
participantKey
```

and handles MongoDB duplicate-key errors.

This prevents two simultaneous requests from creating duplicate direct conversations.

Participant records use:

```text
conversationId + userId
```

as a unique combination.

This prevents duplicate participant records.

---

# Message Ordering

Messages contain:

```text
createdAt
```

and are sorted chronologically.

Conversation lists are sorted using:

```text
lastMessageTime
```

so conversations with recent activity appear first.

---

# Message Loading

When a conversation is opened:

```text
Select conversation
        ↓
Join Socket.IO room
        ↓
Fetch message history
        ↓
Merge REST history
with messages received
during loading
        ↓
Remove duplicates
        ↓
Sort by createdAt
        ↓
Render messages
```

This prevents race conditions where a new Socket.IO message arrives while message history is being fetched.

---

# File Storage Design

Files are intentionally separated from message storage.

MongoDB/Cassandra stores metadata:

```text
fileName
fileUrl
fileType
fileSize
publicId
resourceType
```

Cloudinary stores the actual binary file.

This avoids storing large binary files directly inside the database.

---

# Security Notes

* Cloudinary API secrets remain server-side.
* `.env` must not be committed.
* File type validation exists on the backend.
* File size is limited to 20 MB.
* File uploads are handled by the communication server.
* Users can only edit/delete their own messages through sender validation.
* Cloudinary assets are deleted when their associated file message is deleted.

---

# Status

The communication widget currently supports a complete basic real-time messaging workflow with persistent conversations, real-time Socket.IO communication, mentions, and Cloudinary-backed file sharing.

The next major scalability step is migration of message/conversation persistence from MongoDB to Cassandra.

````

### One correction I intentionally made

Your old README's `Message` model stopped at:

```text
Message
├── conversationId
├── senderId
├── content
├── messageType
├── status
├── isDeleted
└── timestamps
````

but your **current implementation** has an `attachment` object, so it should now be documented as:

```text
Message
├── conversationId
├── senderId
├── content
├── messageType
├── attachment
│   ├── fileName
│   ├── fileUrl
│   ├── fileType
│   ├── fileSize
│   ├── publicId
│   └── resourceType
├── status
├── isDeleted
└── timestamps
```

That reflects what you actually built rather than the earlier local-storage version.




Announcemnt services 
| Function             | Method | Route                                                                      |
| -------------------- | ------ | -------------------------------------------------------------------------- |
| Create portal        | POST   | `/announcement-portals`                                                    |
| Get user's portals   | GET    | `/announcement-portals?userId=...`                                         |
| Add members          | POST   | `/announcement-portals/:portalId/members`                                  |
| Create announcement  | POST   | `/announcement-portals/:portalId/announcements`                            |
| Get announcements    | GET    | `/announcement-portals/:portalId/announcements?userId=...`                 |
| Get one announcement | GET    | `/announcement-portals/:portalId/announcements/:announcementId?userId=...` |
| Update announcement  | PATCH  | `/announcement-portals/:portalId/announcements/:announcementId`            |
| Delete announcement  | DELETE | `/announcement-portals/:portalId/announcements/:announcementId?userId=...` |




connecting Cassndra

 docker destop container active
terminal
cmd 1.  docker start cassandra-dev
start cqlsh
cmd 2. docker exec -it cassandra-dev cqlsh
cmd 3.  use navriti;
