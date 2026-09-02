import "./App.css";
import CommunicationWidget from "../../widget/src/CommunicationWidget";

const currentUser = {
    userId: "user-13",
    displayName: "Khushboo13",
    role: "admin",
};

const serverUrl = "http://localhost:5000";

const users = [
    currentUser,

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
];

function App() {
    return (
        <main className="host-test-shell">
            <header className="host-test-header">
                <div>
                    <span className="host-test-eyebrow">
                        Integration sandbox
                    </span>
                    <h1>Host Application</h1>
                    <p>
                        Global styles are intentionally loud here to test widget isolation.
                    </p>
                </div>

                <button type="button" className="host-test-action">
                    Host Action
                </button>
            </header>

            <section className="host-test-grid">
                <article className="host-test-card">
                    <span>Connected users</span>
                    <strong>{users.length}</strong>
                </article>
                <article className="host-test-card">
                    <span>Environment</span>
                    <strong>Local</strong>
                </article>
                <article className="host-test-card host-test-card-highlight">
                    <span>Widget status</span>
                    <strong>Ready to test</strong>
                </article>
            </section>

            <section className="host-test-widget-stage">
                <div className="host-test-stage-label">
                    Embedded Communication Widget
                </div>
                <CommunicationWidget
                    currentUser={currentUser}
                    users={users}
                    serverUrl={serverUrl}
                />
            </section>
        </main>
    );
}

export default App;