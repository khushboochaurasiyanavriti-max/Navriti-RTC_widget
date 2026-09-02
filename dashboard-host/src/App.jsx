import "./App.css";
import CommunicationWidget from "@rtc-widget/react";
import "@rtc-widget/react/style.css";
const currentUser = {
  userId: "user-10",
    displayName: "Rahul",
    role: "user",
  
};

const users = [
  currentUser,

  {
    userId: "user-1",
    displayName: "Admin 1",
    role: "admin",
  },

  {
    userId: "user-2",
    displayName: "Admin 2",
    role: "admin",
  },

  {
    userId: "user-8",
    displayName: "Khushboo",
    role: "user",
  },

  {
    userId: "user-9",
    displayName: "Prince",
    role: "user",
  },

  {
    userId: "user-13",
    displayName: "Khushboo13",
    role: "admin",
  },

  {
    userId: "user-12",
    displayName: "Khushboo12",
    role: "user",
  },

  {
    userId: "user-14",
    displayName: "Khushboo14",
    role: "user",
  },

  {
    userId: "user-15",
    displayName: "Khushboo15",
    role: "user",
  },

  {
    userId: "user-16",
    displayName: "Khushboo16",
    role: "user",
  },

  {
    userId: "user-17",
    displayName: "Khushboo17",
    role: "user",
  },

  // New test users

  {
    userId: "user-18",
    displayName: "Host 18",
    role: "admin",
  },

  {
    userId: "user-19",
    displayName: "User 19",
    role: "user",
  },

  {
    userId: "user-20",
    displayName: "Host 20",
    role: "admin",
  },

  {
    userId: "user-21",
    displayName: "User 21",
    role: "user",
  },

  {
    userId: "user-22",
    displayName: "User 22",
    role: "user",
  },

  {
    userId: "user-23",
    displayName: "User 23",
    role: "user",
  },
];

function App() {
  return (
    <main className="host-dashboard-shell">
      <header className="header">
        <h1>Dashboard Host Application</h1>
      </header>

      <main className="dashboard">
        <div className="card">
          <h2>Total Users</h2>
          <p>1,250</p>
        </div>

        <div className="card">
          <h2>Revenue</h2>
          <p>₹2,45,000</p>
        </div>

        <div className="card">
          <h2>Active Sessions</h2>
          <p>128</p>
        </div>

        <div className="card">
          <h2>Support Tickets</h2>
          <p>18</p>
        </div>
      </main>

      <CommunicationWidget
        currentUser={currentUser}
        users={users}
        serverUrl="http://localhost:5000"
      />
    </main>
  );
}

export default App;