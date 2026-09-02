# Communication Widget Issues

Authentication is owned by the host application and is excluded from this report. The items below focus on practical behavior and integration improvements for the current widget.

## Whole Widget Issues

### 1. Conversation creation could use better failure cleanup

Group creation creates the conversation before inserting participants. A participant insertion failure leaves an unusable conversation. Direct-chat recovery handles duplicate conversations, but the participant insert is still not transactional.

Locations: [conversationController.js](communication-server/src/controllers/conversationController.js#L22), [conversationController.js](communication-server/src/controllers/conversationController.js#L294)

### 2. API and socket configuration is shared between widget instances

The module-level API and socket singletons are shared by every widget instance. This is fine for one widget per host page, but multiple instances using different `serverUrl` values would share the first configuration.

Locations: [api.js](widget/src/services/api.js#L3), [socket.js](widget/src/services/socket.js#L4)

## Announcement Portal Issues

These are mostly edge cases to address as the feature becomes more heavily used.

### 1. Stale announcement responses can overwrite the active portal

`getAnnouncements()` updates state after awaiting without checking whether the selected portal is still the same. Rapidly switching or closing portals can display announcements from the previous portal.

Location: [AnnouncementPortal.jsx](widget/src/components/AnnouncementPortal/AnnouncementPortal.jsx#L649)

### 2. Stale member responses can overwrite another portal's members

`loadPortalMembers()` can finish after the user switches portals and replace `portalMembers` with data belonging to the previous portal.

Location: [AnnouncementPortal.jsx](widget/src/components/AnnouncementPortal/AnnouncementPortal.jsx#L580)

### 3. Portal refresh requests can finish out of order

Socket events and mutations call `loadPortals()` independently. An older response can overwrite newer portal and membership data, including clearing a valid selection.

Locations: [AnnouncementPortal.jsx](widget/src/components/AnnouncementPortal/AnnouncementPortal.jsx#L409), [AnnouncementPortal.jsx](widget/src/components/AnnouncementPortal/AnnouncementPortal.jsx#L476)

### 4. WebRTC supports only one remote user

The portal uses one `RTCPeerConnection` for every participant. Once the first remote user creates a connection, later users reuse it. Signaling is broadcast to the entire room instead of being targeted to a specific peer.

Locations: [AnnouncementPortal.jsx](widget/src/components/AnnouncementPortal/AnnouncementPortal.jsx#L723), [socketHandler.js](communication-server/src/socket/socketHandler.js#L74)

## Additional Improvements

### 5. ICE candidates can be lost

ICE candidates received before `setRemoteDescription()` are discarded because there is no pending-candidate queue. This can cause intermittent connection failures.

Location: [AnnouncementPortal.jsx](widget/src/components/AnnouncementPortal/AnnouncementPortal.jsx#L889)

### 6. Frontend and backend portal permissions disagree

The frontend allows hosts to open the create-portal modal, but the backend only permits admins to create portals. Hosts will see a form that always fails on submission.

Locations: [AnnouncementPortal.jsx](widget/src/components/AnnouncementPortal/AnnouncementPortal.jsx#L1550), [announcementPortalController.js](communication-server/src/controllers/announcementPortalController.js#L46)

### 7. Admin actions are not consistently exposed in the UI

The backend allows portal admins to create, update, and delete announcements, but the parent only passes `canManage` when the selected role is `host`.

Locations: [AnnouncementPortal.jsx](widget/src/components/AnnouncementPortal/AnnouncementPortal.jsx#L1674), [AnnouncementList.jsx](widget/src/components/AnnouncementPortal/AnnouncementList/AnnouncementList.jsx#L36)

### 8. Portal deletion could clean up related announcements

Members are deleted before the portal. A failure between operations can leave inconsistent data. The controller also does not delete announcements for the removed portal, despite the surrounding comment indicating that it should.

Location: [announcementPortalController.js](communication-server/src/controllers/announcementPortalController.js#L1390)

### 9. Portal creation could use one database transaction

Portal creation, host membership creation, and participant insertion happen as separate database operations. A failure during a later operation can leave an incomplete portal.

Locations: [announcementPortalController.js](communication-server/src/controllers/announcementPortalController.js#L91), [announcementPortalController.js](communication-server/src/controllers/announcementPortalController.js#L186)

## Small Cleanup

### 10. Obsolete member callback remains

`PortalMembers` still destructures `onToggleAddMember` but never uses it, causing a lint error and leaving the child API stale.

Location: [PortalMembers.jsx](widget/src/components/AnnouncementPortal/PortalMembers/PortalMembers.jsx#L18)

## Recommended Tests

- Switch portals rapidly while announcements and members are loading.
- Trigger multiple conversation and portal refreshes simultaneously.
- Connect three or more users to one portal WebRTC room.
- Deliver ICE candidates before the remote description.
- Verify host and admin permissions consistently across UI and API.
- Simulate database failure during portal deletion and creation.
