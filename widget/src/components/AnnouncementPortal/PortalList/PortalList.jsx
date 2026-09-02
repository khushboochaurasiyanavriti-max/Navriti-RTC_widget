function PortalList({
    portals = [],
    selectedPortal,
    onSelect,
}) {
    if (!portals.length) {
        return null;
    }

    return (
        <div className="announcement-portals">

            <div className="announcement-portal-label">
                Portals
            </div>

            <div className="announcement-portal-list">

                {portals.map((portal) => {

                    const isSelected =
                        selectedPortal?._id === portal._id;

                    return (
                        <button
                            key={portal._id}
                            type="button"
                            className={`announcement-portal-item ${
                                isSelected ? "active" : ""
                            }`}
                            onClick={() =>
                                onSelect(portal)
                            }
                        >
                            <span>
                                {portal.name}
                            </span>

                            <small>
                                {portal.role}
                            </small>
                        </button>
                    );
                })}

            </div>
        </div>
    );
}

export default PortalList;
