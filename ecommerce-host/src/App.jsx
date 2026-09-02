import "./App.css";
import CommunicationWidget from "@rtc-widget/react";
import "@rtc-widget/react/style.css";

const currentUser = {
    userId: "user-14",
    displayName: "Khushboo14",
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
        userId: "user-10",
        displayName: "Rahul",
        role: "user",
    },
    {
        userId: "user-12",
        displayName: "Khushboo12",
        role: "user",
    },
    {
        userId: "user-13",
        displayName: "Khushboo13",
        role: "admin",
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
];

function App() {
    return (
        <main className="host-store-shell">
            <header className="host-store-header">
                <div>
                    <span>Northstar Commerce</span>
                    <h1>Store Operations</h1>
                </div>
                <button type="button">Account</button>
            </header>
            <section className="host-store-content">
                <article className="host-store-banner">
                    <span>Host application styling</span>
                    <h2>Support, updates, and team chat in one place.</h2>
                </article>
                <CommunicationWidget
                    currentUser={currentUser}
                    users={users}
                    serverUrl="http://localhost:5000"
                />
            </section>
        </main>
    );
}

export default App;