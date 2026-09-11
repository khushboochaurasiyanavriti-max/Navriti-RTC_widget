import "./AnnouncementAttachments.css";

import {
    downloadAnnouncementAttachment ,
} from "../../../services/announcementPortalService";


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
    portalId,
    announcementId,
    userId,
    platformId,
}) {

    if (
        !attachments ||
        attachments.length === 0
    ) {
        return null;
    }


    const handleAttachmentOpen = async (
        attachment
    ) => {

        try {

            const blob =
                await downloadAnnouncementAttachment({
                    
                    publicId:
                        attachment.publicId,
                    userId,
                    platformId,
                    fileType:
                        attachment.fileType,
                    fileName:
                        attachment.fileName,
                    resourceType:
                        attachment.resourceType ||"raw",
                });


            const blobUrl =
                window.URL.createObjectURL(
                    blob
                );


            /*
             * Open decrypted file in a new tab.
             */
            window.open(
                blobUrl,
                "_blank",
                "noopener,noreferrer"
            );


            /*
             * Give the browser enough time to
             * load the file before revoking URL.
             */
            setTimeout(() => {

                window.URL.revokeObjectURL(
                    blobUrl
                );

            }, 60 * 1000);


        } catch (error) {

            console.error(
                "Failed to open announcement attachment:",
                error
            );

        }

    };


    return (
        <div className="announcement-attachments">

            <div className="announcement-attachments-title">
                Attachments
            </div>


            <div className="announcement-attachment-list">

                {attachments.map(
                    (
                        attachment,
                        index
                    ) => {

                        const key =
                            attachment.publicId ||
                            attachment.url ||
                            `${attachment.fileName}-${index}`;


                        return (
                            <button
                                key={key}
                                type="button"
                                className="announcement-attachment"
                                onClick={() =>
                                    handleAttachmentOpen(
                                        attachment
                                    )
                                }
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

                            </button>
                        );

                    }
                )}

            </div>

        </div>
    );
}


export default AnnouncementAttachments;