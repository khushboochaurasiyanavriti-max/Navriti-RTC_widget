import "./MembersPanel.css";

function MembersPanel({
    members = [],
    currentUser,
}) {
    return (
        <div className="rtc-members-panel">

            <div className="rtc-members-panel-header">

                <h3>
                    Members
                </h3>

                <span>
                    {members.length}
                </span>

            </div>


            <div className="rtc-members-list">

                {members.map((user) => (

                    <div
                        className="rtc-member-item"
                        key={user.userId}
                    >

                        <div className="rtc-member-avatar">
                            {user.displayName
                                ?.charAt(0)
                                .toUpperCase()}
                        </div>


                        <div className="rtc-member-name">
                            {user.displayName}
                        </div>


                        {user.userId ===
                            currentUser?.userId && (
                            <span className="rtc-member-you">
                                You
                            </span>
                        )}

                    </div>

                ))}

            </div>

        </div>
    );
}

export default MembersPanel;