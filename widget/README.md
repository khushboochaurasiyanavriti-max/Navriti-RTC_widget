# @rtc-widget/react

Reusable React Communication Widget with 1-on-1 & group messaging, announcement portals, WebRTC screen sharing, and multi-tenant platform isolation.

---

## 📦 Installation & Usage

In your host application:

```bash
npm install @rtc-widget/react
```

Import component and styles:

```jsx
import CommunicationWidget from "@rtc-widget/react";
import "@rtc-widget/react/style.css";

function App() {
  const currentUser = {
    userId: "user-123",
    displayName: "Jane Doe",
    role: "user", // "user" | "admin"
  };

  const users = [
    currentUser,
    { userId: "user-456", displayName: "John Admin", role: "admin" },
  ];

  return (
    <CommunicationWidget
      currentUser={currentUser}
      users={users}
      serverUrl="http://localhost:5000"
      platformId="platform-test1"
      features={{
        chat: true,
        groupChat: true,
        announcements: true,
        screenShare: true,
      }}
    />
  );
}
```

---

## ⚙️ Component Props Reference

| Prop Name | Type | Description | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| `currentUser` | `Object` | Object containing `{ userId, displayName, role }` | Yes | — |
| `users` | `Array` | Array of available user objects in the system | Yes | `[]` |
| `serverUrl` | `String` | URL of the backend `communication-server` | Yes | `"http://localhost:5000"` |
| `platformId` | `String` | Tenant identifier for platform isolation | Yes | — |
| `features` | `Object` | Feature flags object `{ chat, groupChat, announcements, screenShare }` | No | All `true` |
| `onBack` | `Function` | Optional callback when widget close/back button is clicked | No | — |

---

## 🛠️ Build Commands

```bash
# Development mode
npm run dev

# Build library dist/ files
npm run build

# Preview build
npm run preview
```
