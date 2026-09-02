import { useEffect, useState } from "react";

import "./EditAnnouncementModal.css";

function EditAnnouncementModal({
    isOpen,
    announcement,
    onClose,
    onUpdate,
}) {
    const [title, setTitle] =
        useState("");

    const [content, setContent] =
        useState("");

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    /*
     * ---------------------------------------------
     * Load announcement data when modal opens
     * ---------------------------------------------
     */
    useEffect(() => {

        if (!isOpen || !announcement) {
            return;
        }

        setTitle(
            announcement.title || ""
        );

        setContent(
            announcement.content || ""
        );

        setError("");

    }, [
        isOpen,
        announcement,
    ]);


    /*
     * ---------------------------------------------
     * Submit update
     * ---------------------------------------------
     */
    const handleSubmit = async (event) => {

        event.preventDefault();

        if (!title.trim()) {
            setError(
                "Title is required"
            );

            return;
        }

        if (!content.trim()) {
            setError(
                "Content is required"
            );

            return;
        }

        try {

            setSubmitting(true);
            setError("");

            await onUpdate({
                title: title.trim(),
                content: content.trim(),
            });

        } catch (error) {

            console.error(
                "Failed to update announcement:",
                error
            );

            setError(
                "Failed to update announcement"
            );

        } finally {

            setSubmitting(false);

        }
    };


    /*
     * ---------------------------------------------
     * Don't render when closed
     * ---------------------------------------------
     */
    if (
        !isOpen ||
        !announcement
    ) {
        return null;
    }


    return (
        <div className="announcement-modal-overlay">

            <div className="announcement-modal">

                {/* =================================
                    Header
                ================================== */}

                <div className="announcement-modal-header">

                    <h3>
                        Edit Announcement
                    </h3>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        ×
                    </button>

                </div>


                {/* =================================
                    Form
                ================================== */}

                <form
                    onSubmit={handleSubmit}
                    className="announcement-form"
                >

                    {error && (
                        <div className="announcement-form-error">
                            {error}
                        </div>
                    )}


                    {/* =================================
                        Title
                    ================================== */}

                    <label>

                        Title

                        <input
                            type="text"
                            value={title}
                            onChange={(event) =>
                                setTitle(
                                    event.target.value
                                )
                            }
                            placeholder="Announcement title"
                            disabled={
                                submitting
                            }
                        />

                    </label>


                    {/* =================================
                        Content
                    ================================== */}

                    <label>

                        Content

                        <textarea
                            value={content}
                            onChange={(event) =>
                                setContent(
                                    event.target.value
                                )
                            }
                            placeholder="Write your announcement..."
                            rows={6}
                            disabled={
                                submitting
                            }
                        />

                    </label>


                    {/* =================================
                        Existing announcement information
                    ================================== */}

                    <div className="announcement-edit-info">

                        <span>
                            Audience:
                        </span>

                        <strong>
                            {
                                announcement.targetAudience ===
                                "all"
                                    ? "Everyone"
                                    : "Selected users"
                            }
                        </strong>

                    </div>


                    {/* =================================
                        Attachments
                    ================================== */}

                    {announcement.attachments?.length > 0 && (

                        <div className="announcement-edit-attachments">

                            <div className="announcement-edit-attachments-title">
                                Existing attachments
                            </div>

                            {announcement.attachments.map(
                                (
                                    attachment,
                                    index
                                ) => (

                                    <div
                                        key={
                                            attachment.publicId ||
                                            attachment.url ||
                                            index
                                        }
                                        className="announcement-edit-attachment"
                                    >

                                        <span>
                                            📎
                                        </span>

                                        <span>
                                            {
                                                attachment.fileName ||
                                                "Attachment"
                                            }
                                        </span>

                                    </div>

                                )
                            )}

                        </div>

                    )}


                    {/* =================================
                        Actions
                    ================================== */}

                    <div className="announcement-form-actions">

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={
                                submitting
                            }
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            disabled={
                                submitting
                            }
                        >
                            {
                                submitting
                                    ? "Saving..."
                                    : "Save Changes"
                            }
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}

export default EditAnnouncementModal;