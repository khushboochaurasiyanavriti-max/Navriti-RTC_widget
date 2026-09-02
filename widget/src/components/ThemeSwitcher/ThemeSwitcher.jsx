const themes = [
    {
        id: "light",
        label: "Light",
        icon: "☀",
    },
    {
        id: "dark",
        label: "Dark",
        icon: "◐",
    },
    {
        id: "night",
        label: "Night",
        icon: "☾",
    },
];

function ThemeSwitcher({ theme, onChange }) {
    return (
        <div
            className="rtc-theme-switcher"
            role="group"
            aria-label="Choose widget theme"
        >
            {themes.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className={`rtc-theme-option ${
                        theme === item.id ? "active" : ""
                    }`}
                    onClick={() => onChange(item.id)}
                    aria-label={`${item.label} theme`}
                    aria-pressed={theme === item.id}
                    title={`${item.label} theme`}
                >
                    <span aria-hidden="true">
                        {item.icon}
                    </span>
                </button>
            ))}
        </div>
    );
}

export default ThemeSwitcher;
