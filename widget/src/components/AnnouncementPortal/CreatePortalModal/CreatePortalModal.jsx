import { useEffect, useState } from "react";

import "./CreatePortalModal.css";


function CreatePortalModal({
    isOpen,
    onClose,
    onCreate,
    users = [],
    currentUser,
}) {

    const [name, setName] =
        useState("");

    const [description, setDescription] =
        useState("");

    const [targetAudience, setTargetAudience] =
        useState("all");

    const [selectedMembers, setSelectedMembers] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");


    /*
     * Reset when modal opens
     */

    useEffect(() => {

        if (!isOpen) {
            return;
        }

        setName("");
        setDescription("");
        setTargetAudience("all");
        setSelectedMembers([]);
        setSearch("");
        setError("");

    }, [isOpen]);


    if (!isOpen) {
        return null;
    }


    /*
     * Don't show current user
     * because creator automatically becomes host.
     */

    const availableUsers =
        users.filter(
            (user) =>
                user.userId !==
                currentUser?.userId
        );


    const filteredUsers =
        availableUsers.filter((user) => {

            const value =
                search
                    .toLowerCase()
                    .trim();

            if (!value) {
                return true;
            }

            return (
                user.displayName
                    ?.toLowerCase()
                    .includes(value) ||
                user.userId
                    ?.toLowerCase()
                    .includes(value)
            );

        });


    const toggleMember = (userId) => {

        setSelectedMembers((prev) => {

            if (prev.includes(userId)) {

                return prev.filter(
                    (id) =>
                        id !== userId
                );

            }

            return [
                ...prev,
                userId,
            ];

        });

    };


    const handleAudienceChange = (
        event
    ) => {

        const value =
            event.target.value;

        setTargetAudience(value);

        /*
         * If portal is for everyone,
         * selected members are irrelevant.
         */

        if (value === "all") {
            setSelectedMembers([]);
        }

    };


    const handleSubmit = async (event) => {

        event.preventDefault();


        if (!name.trim()) {

            setError(
                "Portal name is required"
            );

            return;
        }


        /*
        * Selected portal must have
        * at least one candidate.
        */

        if (
            targetAudience === "selected" &&
            selectedMembers.length === 0
        ) {

            setError(
                "Select at least one candidate"
            );

            return;
        }


        try {

            setSubmitting(true);
            setError("");


            /*
            * For "all":
            * add every available user
            * as a participant.
            *
            * For "selected":
            * add only selected users.
            */

            const members =
                targetAudience === "all"
                    ? availableUsers.map(
                        (user) => ({
                            userId:
                                user.userId,

                            role:
                                "participant",
                        })
                    )
                    : selectedMembers.map(
                        (userId) => ({
                            userId,

                            role:
                                "participant",
                        })
                    );


            await onCreate({

                name:
                    name.trim(),

                description:
                    description.trim(),

                targetAudience,

                members,

            });


            /*
            * Reset after successful creation.
            */

            setName("");
            setDescription("");
            setTargetAudience("all");
            setSelectedMembers([]);
            setSearch("");


        } catch (error) {

            console.error(
                "Failed to create portal:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "Failed to create portal"
            );

        } finally {

            setSubmitting(false);

        }
    };


    return (

        <div className="create-portal-overlay">

            <div className="create-portal-modal">


                {/* Header */}

                <div className="create-portal-header">

                    <div>

                        <h3>
                            Create Announcement Portal
                        </h3>

                        <p>
                            Create a portal and choose
                            who can access it.
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="create-portal-close"
                    >
                        ×
                    </button>

                </div>


                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="create-portal-form"
                >

                    {error && (

                        <div className="create-portal-error">
                            {error}
                        </div>

                    )}


                    {/* Name */}

                    <label>

                        Portal name

                        <input
                            type="text"
                            value={name}
                            onChange={(event) =>
                                setName(
                                    event.target.value
                                )
                            }
                            placeholder="e.g. Engineering Updates"
                            disabled={submitting}
                        />

                    </label>


                    {/* Description */}

                    <label>

                        Description

                        <textarea
                            value={
                                description
                            }
                            onChange={(event) =>
                                setDescription(
                                    event.target.value
                                )
                            }
                            placeholder="What is this portal for?"
                            rows={3}
                            disabled={submitting}
                        />

                    </label>


                    {/* Audience */}

                    <label>

                        Audience

                        <select
                            value={
                                targetAudience
                            }
                            onChange={
                                handleAudienceChange
                            }
                            disabled={
                                submitting
                            }
                        >

                            <option value="all">
                                Everyone
                            </option>

                            <option value="selected">
                                Selected candidates
                            </option>

                        </select>

                    </label>


                    {/* Selected Members */}

                    {targetAudience ===
                        "selected" && (

                        <div className="create-portal-members">

                            <div className="create-portal-members-header">

                                <div>

                                    <div className="create-portal-members-title">
                                        Candidates
                                    </div>

                                    <div className="create-portal-members-count">
                                        {
                                            selectedMembers.length
                                        }{" "}
                                        selected
                                    </div>

                                </div>

                            </div>


                            {/* Search */}

                            <input
                                type="text"
                                className="create-portal-member-search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="Search users..."
                                disabled={
                                    submitting
                                }
                            />


                            {/* User list */}

                            <div className="create-portal-user-list">

                                {filteredUsers.length ===
                                    0 && (

                                    <div className="create-portal-no-users">
                                        No users found
                                    </div>

                                )}


                                {filteredUsers.map(
                                    (user) => {

                                        const selected =
                                            selectedMembers.includes(
                                                user.userId
                                            );


                                        return (

                                            <button
                                                key={
                                                    user.userId
                                                }
                                                type="button"
                                                className={`create-portal-user ${
                                                    selected
                                                        ? "selected"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    toggleMember(
                                                        user.userId
                                                    )
                                                }
                                                disabled={
                                                    submitting
                                                }
                                            >

                                                <span
                                                    className={`create-portal-checkbox ${
                                                        selected
                                                            ? "checked"
                                                            : ""
                                                    }`}
                                                >
                                                    {selected
                                                        ? "✓"
                                                        : ""}
                                                </span>


                                                <span className="create-portal-user-info">

                                                    <span className="create-portal-user-name">
                                                        {
                                                            user.displayName ||
                                                            user.userId
                                                        }
                                                    </span>

                                                    <span className="create-portal-user-id">
                                                        {
                                                            user.userId
                                                        }
                                                    </span>

                                                </span>


                                                <span className="create-portal-user-role">
                                                    {
                                                        user.role
                                                    }
                                                </span>

                                            </button>

                                        );

                                    }
                                )}

                            </div>

                        </div>

                    )}


                    {/* Actions */}

                    <div className="create-portal-actions">

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={
                                submitting
                            }
                            className="create-portal-cancel"
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            disabled={
                                submitting
                            }
                            className="create-portal-submit"
                        >
                            {submitting
                                ? "Creating..."
                                : "Create Portal"}
                        </button>

                    </div>

                </form>

            </div>

        </div>

    );
}


export default CreatePortalModal;