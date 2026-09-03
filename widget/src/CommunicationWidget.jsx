import { useEffect, useState } from "react";
import root from "react-shadow";
import WidgetContainer from "./components/WidgetContainer/WidgetContainer";
import { initializeConfig } from "./services/config";
import { initializeApi } from "./services/api";
import { initializeSocket } from "./services/socket";
import shadowStyles from "./shadow.css?inline";

function CommunicationWidget({
    currentUser,
    users,
    serverUrl,

    //feature configuration
    features,

    // Launcher
    launcherIcon = "💬",
    defaultOpen = false,
}) {
    const [open, setOpen] = useState(defaultOpen);
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("rtc-widget-theme") || "light";
        } catch {
            return "light";
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("rtc-widget-theme", theme);
        } catch {
            // Theme persistence is optional for embedded hosts.
        }
    }, [theme]);

    useEffect(() => {
        if (!serverUrl) {
            console.error(
                "CommunicationWidget: serverUrl is required"
            );
            return;
        }

        initializeConfig(serverUrl);
        initializeApi();
        initializeSocket();
    }, [serverUrl]);

    const toggleWidget = () => {
        setOpen((prev) => !prev);
    };

    const closeWidget = () => {
        setOpen(false);
    };

    return (
        <root.div className="rtc-widget-shadow">
            <style>{shadowStyles}</style>
            <button
                type="button"
                className="rtc-launcher"
                onClick={toggleWidget}
                aria-label={
                    open
                        ? "Close Communication Widget"
                        : "Open Communication Widget"
                }
            >
                {launcherIcon}
            </button>

            {open && (
                <div className="rtc-popup">
                    <WidgetContainer
                        currentUser={currentUser}
                        users={users}
                        serverUrl={serverUrl}
                        features={features}
                        onClose={closeWidget}
                        theme={theme}
                        onThemeChange={setTheme}
                        /*
                        
                        platform_Id="yxq-app"
                        features={{
                            directChat: true,
                            groupChat: true,
                            fileSharing: true,
                        }}


                        */
                    />

                </div>
            )}
        </root.div>
    );
}

export default CommunicationWidget;