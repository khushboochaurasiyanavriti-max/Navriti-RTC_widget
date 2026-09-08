# Known Issues and Follow-Up Work

This document tracks unresolved technical issues and follow-up improvements in the Navriti RTC Widget repository.

---

# 1. Socket Reconnection Should Restore Active Rooms

## Status

Open

## Description

The Socket.IO client supports automatic reconnection:

```js
reconnection: true,
reconnectionAttempts: Infinity,
reconnectionDelay: 1000,
reconnectionDelayMax: 5000,
```

After a network interruption, Socket.IO can establish a new underlying connection.

The application should explicitly restore the real-time rooms and feature state required by active widget activities.

## Potential State to Restore

- User room
- Active conversation rooms
- Announcement RTC room
- Screen-share signaling room, where applicable
- Other feature-specific rooms

## Recommended Flow

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
New connection established
        │
        ├── Rejoin user room
        ├── Rejoin active conversation rooms
        ├── Restore announcement RTC state
        ├── Restore feature-specific signaling rooms
        └── Resume real-time events
```

## Relevant Areas

```text
widget/src/services/socket.js
widget feature components that join Socket.IO rooms
communication-server/src/socket/
```

## Why It Matters

The widget supports concurrent real-time activities. Without explicit room restoration, an activity may remain visually active after reconnecting while no longer receiving events from its corresponding Socket.IO room.

---

# 2. Socket Connection State Should Be Managed Independently From Feature State

## Status

Open

## Description

The application should maintain one shared Socket.IO connection while keeping feature state independent.

A single socket can concurrently carry:

- Conversation events
- Message events
- File-sharing events
- Screen-share signaling
- Announcement RTC signaling
- WebRTC signaling
- Connection lifecycle events

The socket connection itself should not be recreated every time a feature is opened or closed.

## Recommended Architecture

```text
One Socket.IO Connection
        │
        ├── User session
        ├── Conversation rooms
        ├── Messaging events
        ├── Screen-share signaling
        ├── Announcement RTC signaling
        └── Other concurrent activities
```

Feature components should join and leave only their own rooms without unnecessarily disconnecting the shared socket.

---

# 3. Multi-Instance Widget Isolation Should Continue to Be Tested

## Status

Needs Continued Testing

## Description

The widget is designed to be reusable and embeddable in host applications.

Multiple widget instances should not accidentally overwrite each other's local UI state or feature activity state.

## Test Scenarios

Test at least:

1. Open two widget instances simultaneously.
2. Open different conversations in each instance.
3. Trigger messaging activity in both instances.
4. Test screen sharing from one instance.
5. Test announcement portal activity from another instance.
6. Verify closing one widget does not disconnect the other widget's active features.
7. Verify reconnection behavior while multiple instances are active.

## Relevant Areas

```text
widget/
demo-host-app/
widget-host-test/
dashboard-host/
ecommerce-host/
```

---

# 4. WebSocket Transport Configuration Should Be Tested Across Networks

## Status

Needs Continued Testing

## Current Configuration

```js
transports: ["websocket", "polling"],
```

The widget now prefers WebSocket and retains HTTP polling as a fallback.

## Test Scenarios

Verify behavior on:

- Local development network
- Different Wi-Fi networks
- Restricted corporate/proxy networks, where available
- Slow connections
- Temporary network interruption
- Server restart during an active widget session

## Expected Behavior

```text
Try WebSocket
    │
    ├── Success → Real-time WebSocket communication
    │
    └── Failure → HTTP polling fallback
```

The fallback should preserve application functionality when direct WebSocket connectivity is unavailable.

---

# 5. Reconnection Testing Should Cover Concurrent Features

## Status

Open

## Description

Automatic socket reconnection should be tested while multiple widget features are active.

## Required Test Cases

### Messaging

- Disconnect network while a conversation is open.
- Restore network.
- Verify new messages are received after reconnection.
- Verify message sending resumes.

### Screen Share

- Start screen sharing.
- Simulate network interruption.
- Restore connection.
- Verify signaling behavior and screen-share state.

### Announcement RTC

- Join an announcement RTC session.
- Interrupt the network.
- Restore the network.
- Verify RTC signaling and participant state.

### Multiple Activities

- Keep a conversation active.
- Run another real-time activity.
- Interrupt the network.
- Restore connectivity.
- Verify each activity independently resumes or clearly handles reconnection.

---

# 6. Legacy Migration & Standalone Test Utilities Cleaned Up

## Status

Resolved

## Description

The temporary database migration and scratch test utility scripts (`testCassandra.js`, `testMessageCassandra.js`, `testAnnouncementCassandra.js`, and legacy migration scripts) have been removed from `communication-server/src/`.

The production application runtime relies exclusively on the core Cassandra repositories (`announcementRepository.js`, `conversationRepository.js`, `messageRepository.js`, `participantRepository.js`) and database configurations.

---

# 7. Documentation Must Stay Synchronized With Runtime Code

## Status

Ongoing

## Description

The repository has multiple applications and communication features.

Documentation should be updated whenever there are changes to:

- REST API routes
- Socket.IO event names
- Cassandra configuration
- Widget public API
- Host application setup
- File upload configuration
- WebRTC signaling flow
- Build scripts

## Documentation Files

```text
README.md
Navriti_RTC_Widget_ISSUES.md
```

The README describes the currently active architecture, Cassandra schemas, APIs, socket events, and host application configurations.

---

# Resolved / Current Improvements

The following improvements are currently reflected in the project configuration and documentation.

## WebSocket-First Transport Priority

The Socket.IO client is configured to prefer WebSocket:

```js
transports: ["websocket", "polling"],
```

This allows the client to attempt direct WebSocket communication first while retaining polling as a fallback.

## Automatic Reconnection

## Announcement Portal CRUD Operations & Platform Isolation

- Fixed missing `platform_id` partition key parameters across all Cassandra repository functions (`updateAnnouncement`, `deleteAnnouncement`, `updateMemberRole`, `removeMember`, `getPortalById`, `getMember`, etc.).
- Updated Express controller authorization checks to allow host, admin, and portal creators to manage member roles, remove members, and update/delete announcements.
- Aligned HTTP `DELETE` service methods in `announcementPortalService.js` to pass `platformId` and `hostUserId`/`userId` via query parameters and body.
- Added real-time socket broadcasts (`announcement:created`, `announcement:updated`, `announcement:deleted`, `announcement:member-role-updated`, `announcement:member-removed`, `announcement:portal-deleted`) to synchronize all connected users.

---

# Priority Summary

| Priority | Issue | Status |
|---|---|---|
| Resolved | Announcement Portal CRUD & Member Management | Resolved |
| Resolved | Cassandra Partition Key & Platform Isolation Alignment | Resolved |
| Resolved | Legacy Migration & Scratch Test Utilities Cleanup | Resolved |
| High | Restore active Socket.IO rooms after reconnect | Open |
| High | Test reconnection with concurrent activities | Open |
| Medium | Keep socket connection independent from feature state | Open |
| Medium | Multi-instance widget isolation testing | Needs Continued Testing |
| Medium | Test WebSocket-first transport across networks | Needs Continued Testing |
| Ongoing | Keep documentation synchronized with runtime code | Ongoing |
