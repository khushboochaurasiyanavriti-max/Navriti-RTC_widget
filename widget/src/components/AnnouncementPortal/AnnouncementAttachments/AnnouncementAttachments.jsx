import "./AnnouncementAttachments.css";

const formatFileSize = (bytes) => {

    if (!bytes) {
        return "";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(
            bytes /
            (1024 * 1024)
        ).toFixed(1)} MB`;
    }

    return `${(
        bytes /
        (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
};


function AnnouncementAttachments({
    attachments,
}) {

    if (
        !attachments ||
        attachments.length === 0
    ) {
        return null;
    }


    return (
        <div className="announcement-attachments">

            <div className="announcement-attachments-title">
                Attachments
            </div>


            <div className="announcement-attachment-list">

                {attachments.map(
                    (attachment, index) => {

                        const key =
                            attachment.publicId ||
                            attachment.url ||
                            `${attachment.fileName}-${index}`;

                        return (
                            <a
                                key={key}
                                href={
                                    attachment.url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="announcement-attachment"
                            >

                                <div className="announcement-attachment-icon">
                                    📎
                                </div>


                                <div className="announcement-attachment-info">

                                    <div className="announcement-attachment-name">
                                        {
                                            attachment.fileName ||
                                            "Attachment"
                                        }
                                    </div>


                                    <div className="announcement-attachment-details">

                                        {attachment.fileType && (
                                            <span>
                                                {
                                                    attachment.fileType
                                                }
                                            </span>
                                        )}

                                        {attachment.fileSize && (
                                            <>
                                                <span>
                                                    •
                                                </span>

                                                <span>
                                                    {
                                                        formatFileSize(
                                                            attachment.fileSize
                                                        )
                                                    }
                                                </span>
                                            </>
                                        )}

                                    </div>

                                </div>


                                <div className="announcement-attachment-open">
                                    ↗
                                </div>

                            </a>
                        );
                    }
                )}

            </div>

        </div>
    );
}

export default AnnouncementAttachments;