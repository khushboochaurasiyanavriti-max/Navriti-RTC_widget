import { useState } from "react";

import "./CreateAnnouncementModal.css";


function CreateAnnouncementModal({
    isOpen,
    onClose,
    onCreate,
    users = [],
    currentUser,
}) {

    const [title, setTitle] =
        useState("");

    const [content, setContent] =
        useState("");

    const [targetAudience, setTargetAudience] =
        useState("all");

    const [files, setFiles] =
        useState([]);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");
    const [selectedUserIds, setSelectedUserIds] =
        useState([]);

    if (!isOpen) {
        return null;
    }

    const handleUserToggle = (userId) => {

        setSelectedUserIds((prev) => {

            if (prev.includes(userId)) {
                return prev.filter(
                    (id) => id !== userId
                );
            }

            return [
                ...prev,
                userId,
            ];
        });
    };


    const handleFileChange = (event) => {

        setFiles(
            Array.from(
                event.target.files || []
            )
        );
    };


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
        if (
            targetAudience === "selected" &&
            selectedUserIds.length === 0
        ) {
            setError(
                "Please select at least one user"
            );

            return;
        }


        try {

            setSubmitting(true);
            setError("");


            await onCreate({
                title: title.trim(),
                content: content.trim(),
                targetAudience,
                targetUserIds:
                    targetAudience === "selected"
                        ? selectedUserIds
                        : [],
                files,
            });


            setTitle("");
            setContent("");
            setTargetAudience("all");
            setSelectedUserIds([]);
            setFiles([]);


        } catch (error) {

            console.error(
                "Failed to create announcement:",
                error
            );

            setError(
                "Failed to create announcement"
            );

        } finally {

            setSubmitting(false);

        }
    };


    return (
        <div className="announcement-modal-overlay">

            <div className="announcement-modal">

                {/* Header */}

                <div className="announcement-modal-header">

                    <h3>
                        Create Announcement
                    </h3>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        ×
                    </button>

                </div>


                {/* Form */}

                <form
                    onSubmit={handleSubmit}
                    className="announcement-form"
                >

                    {error && (
                        <div className="announcement-form-error">
                            {error}
                        </div>
                    )}


                    {/* Title */}

                    <label>

                        Title

                        <input
                            type="text"
                            value={title}
                            onChange={(e) =>
                                setTitle(
                                    e.target.value
                                )
                            }
                            placeholder="Announcement title"
                            disabled={
                                submitting
                            }
                        />

                    </label>


                    {/* Content */}

                    <label>

                        Content

                        <textarea
                            value={content}
                            onChange={(e) =>
                                setContent(
                                    e.target.value
                                )
                            }
                            placeholder="Write your announcement..."
                            rows={6}
                            disabled={
                                submitting
                            }
                        />

                    </label>


                    {/* Audience */}

                    <label>

                        Audience

                        <select
                            value={
                                targetAudience
                            }
                            onChange={(e) =>
                                setTargetAudience(
                                    e.target.value
                                )
                            }
                            disabled={
                                submitting
                            }
                        >

                            <option value="all">
                                Everyone
                            </option>

                            <option value="selected">
                                Selected users
                            </option>

                        </select>

                    </label>


                    {targetAudience === "selected" && (

                        <div className="announcement-selected-users">

                            <div className="announcement-selected-users-title">
                                Select users
                            </div>

                            {users.length === 0 ? (

                                <div className="announcement-selected-users-empty">
                                    No users available.
                                </div>

                            ) : (

                                <div className="announcement-user-list">

                                    {users
                                        .filter(
                                            (user) =>
                                                user.userId !==
                                                currentUser?.userId
                                        )
                                        .map((user) => {

                                            const userId =
                                                user.userId;

                                            const isSelected =
                                                selectedUserIds.includes(
                                                    userId
                                                );

                                            return (
                                                <label
                                                    key={userId}
                                                    className="announcement-user-option"
                                                >

                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            isSelected
                                                        }
                                                        onChange={() =>
                                                            handleUserToggle(
                                                                userId
                                                            )
                                                        }
                                                        disabled={
                                                            submitting
                                                        }
                                                    />

                                                    <span>
                                                        {
                                                            user.name ||
                                                            user.displayName ||
                                                            user.email ||
                                                            userId
                                                        }
                                                    </span>

                                                </label>
                                            );
                                        })}

                                </div>
                            )}

                        </div>
                    )}


                    {/* Attachments */}

                    <label>

                        Attachments

                        <input
                            type="file"
                            multiple
                            onChange={
                                handleFileChange
                            }
                            disabled={
                                submitting
                            }
                        />

                    </label>


                    {/* Selected files */}

                    {files.length > 0 && (

                        <div className="announcement-selected-files">

                            {files.map(
                                (file) => (

                                    <div
                                        key={`${file.name}-${file.size}`}
                                    >
                                        📎 {file.name}
                                    </div>

                                )
                            )}

                        </div>

                    )}


                    {/* Actions */}

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
                            {submitting
                                ? "Publishing..."
                                : "Publish"}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}


export default CreateAnnouncementModal;