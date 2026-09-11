import { useEffect, useMemo, useState,useRef } from "react";

import {
    getUserAnnouncementPortals,
    getAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    createAnnouncementPortal,
    updateAnnouncement,
    getAnnouncementPortalMembers,
    addPortalMembers,
    removePortalMember,
    updatePortalMemberRole,
    deleteAnnouncementPortal,

} from "../../services/announcementPortalService";

import {
    getSocket,
    joinAnnouncementRTC,
    leaveAnnouncementRTC,
    sendAnnouncementOffer,
    sendAnnouncementAnswer,
    sendAnnouncementIceCandidate,
} from "../../services/socket.js";

import PortalList
    from "./PortalList/PortalList.jsx";

import PortalHeader
    from "./PortalHeader/PortalHeader.jsx";

import PortalMembers
    from "./PortalMembers/PortalMembers.jsx";

import PortalAnnouncements
    from "./PortalAnnouncements/PortalAnnouncements.jsx";

import CreateAnnouncementModal
    from "./CreateAnnouncementModal/CreateAnnouncementModal.jsx";

import CreatePortalModal
    from "./CreatePortalModal/CreatePortalModal.jsx";

import EditAnnouncementModal
    from "./EditAnnouncementModal/EditAnnouncementModal.jsx";
import ScreenShare from "../ScreenShare/ScreenShare.jsx";
import "./AnnouncementPortal.css";


function AnnouncementPortal({
    currentUser,
    users = [],
    platformId,
    onBack,
}) 
{
    console.log("announcment portl enetered ",platformId);
    const userId =
        currentUser?.userId;

    const userRole =
        currentUser?.role;


    /*
     * --------------------------------------------------
     * State
     * --------------------------------------------------
     */

    const [portals, setPortals] =
        useState([]);

    const [selectedPortal, setSelectedPortal] =
        useState(null);

    const [announcements, setAnnouncements] =
        useState([]);

    const [loadingPortals, setLoadingPortals] =
        useState(true);

    const [loadingAnnouncements, setLoadingAnnouncements] =
        useState(false);

    const [error, setError] =
        useState("");


    const [isCreatePortalOpen, setIsCreatePortalOpen] =
        useState(false);

    const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] =
        useState(false);

    const [editingAnnouncement, setEditingAnnouncement] =
        useState(null);


    /*
     * --------------------------------------------------
     * Portal Members
     * --------------------------------------------------
     */

    const [portalMembers, setPortalMembers] =
        useState([]);

    const [membersLoading, setMembersLoading] =
        useState(false);

    const [showMembers, setShowMembers] =
        useState(false);

    const [showPortalMenu, setShowPortalMenu] =
        useState(false);
    const [showAddMember, setShowAddMember] =
        useState(false);

    const [selectedNewMembers, setSelectedNewMembers] =
        useState([]);

    const [addingMembers, setAddingMembers] =
        useState(false);

    const peerConnectionRef =
        useRef(null);

    const remoteUserRef =
        useRef(null);

    const [showScreenShare, setShowScreenShare] =
        useState(false);



    const handleDeletePortal = async () => {

        if (!selectedPortal) {
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to delete "${selectedPortal.name}"?`
        );

        if (!confirmed) {
            return;
        }

        try {

            setError("");

            await deleteAnnouncementPortal(
                selectedPortal._id,
                userId,
                platformId
            );

            /*
            * Remove deleted portal from local list
            */
            setPortals((prev) =>
                prev.filter(
                    (portal) =>
                        portal._id !== selectedPortal._id
                )
            );

            /*
            * Clear selected portal
            */
            setSelectedPortal(null);

            /*
            * Clear announcements and members
            */
            setAnnouncements([]);
            setPortalMembers([]);

        } catch (error) {

            console.error(
                "Delete portal error:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "Failed to delete announcement portal"
            );
        }
    };

    const handleRoleChange = async (
        memberUserId,
        newRole
    ) => {

        if (!selectedPortal) {
            return;
        }

        if (
            selectedPortal.role !== "host" &&
            selectedPortal.role !== "admin" &&
            selectedPortal.createdBy !== userId &&
            currentUser?.role !== "admin"
        ) {
            return;
        }

        if (memberUserId === userId) {
            return;
        }

        try {

            setError("");

            await updatePortalMemberRole(
                selectedPortal._id,
                memberUserId,
                userId,
                newRole,
                platformId
            );

            const updatedMembers =
                await getAnnouncementPortalMembers(
                    selectedPortal._id,
                    userId,
                    platformId
                );

            setPortalMembers(updatedMembers);

        } catch (error) {

            console.error(
                "Update member role error:",
                error.response?.data || error
            );

            setError(
                error.response?.data?.message ||
                "Failed to update member role"
            );
        }
    };

    /*
     * --------------------------------------------------
     * Portal members available for announcements
     * --------------------------------------------------
     */

    const announcementUsers = useMemo(() => {

        if (!selectedPortal?.members) {
            return [];
        }

        const memberIds =
            selectedPortal.members.map(
                (member) => member.userId
            );

        return users.filter(
            (user) =>
                memberIds.includes(
                    user.userId
                )
        );

    }, [
        selectedPortal,
        users,
    ]);


    const availablePortalMembers = useMemo(() => {

        const existingMemberIds =
            portalMembers.map(
                (member) => member.userId
            );

        return users.filter(
            (user) =>
                user.userId &&
                user.userId !== userId &&
                !existingMemberIds.includes(
                    user.userId
                )
        );

    }, [
        users,
        portalMembers,
        userId,
    ]);


    /*
     * --------------------------------------------------
     * Edit announcement
     * --------------------------------------------------
     */

    const handleEditAnnouncement = (
        announcement
    ) => {

        setEditingAnnouncement(
            announcement
        );
    };


    const handleUpdateAnnouncement = async ({
        title,
        content,
    }) => {

        if (
            !selectedPortal ||
            !editingAnnouncement
        ) {
            return;
        }

        try {

            setError("");

            const updatedAnnouncement =
                await updateAnnouncement(
                    selectedPortal._id,
                    editingAnnouncement._id,
                    {
                        userId,
                        title,
                        content,
                    },
                    platformId
                );

            setAnnouncements((prev) =>
                prev.map(
                    (announcement) =>
                        announcement._id ===
                        updatedAnnouncement._id
                            ? updatedAnnouncement
                            : announcement
                )
            );

            setEditingAnnouncement(null);

        } catch (error) {

            console.error(
                "Failed to update announcement:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "Failed to update announcement"
            );
        }
    };


    /*
     * --------------------------------------------------
     * Load portals
     * --------------------------------------------------
     */

    const loadPortals = async () => {

        if (!userId) {
            return;
        }

        try {

            setLoadingPortals(true);
            setError("");

            const data =
                await getUserAnnouncementPortals(
                    userId,
                    platformId
                );

            console.log(
                "Announcement portals:",
                data
            );

            setPortals(data);


            /*
             * Keep currently selected portal
             * if it still exists.
             */

            setSelectedPortal(
                (currentSelected) => {

                    if (!data.length) {
                        return null;
                    }

                    if (!currentSelected) {
                        return null;
                    }

                    const updatedPortal =
                        data.find(
                            (portal) =>
                                portal._id ===
                                currentSelected._id
                        );

                    return (
                        updatedPortal ||
                        null
                    );
                }
            );

        } catch (error) {

            console.error(
                "Failed to load announcement portals:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "Failed to load announcement portals"
            );

        } finally {

            setLoadingPortals(false);

        }
    };

    /*
    * --------------------------------------------------
    * Announcement portal socket updates
    * --------------------------------------------------
    */

    useEffect(() => {

        if (!userId) {
            return;
        }


        const socket =
            getSocket();


        const handlePortalCreated = () => {

            console.log(
                "Announcement portal created - refreshing portals"
            );

            loadPortals();

        };


        const handlePortalDeleted = (data) => {

            console.log(
                "Announcement portal deleted - refreshing portals"
            );

            if (data?.portalId && selectedPortal?._id === data.portalId) {
                setSelectedPortal(null);
                setAnnouncements([]);
                setPortalMembers([]);
            }

            loadPortals();

        };


        const handlePortalMemberChanged = () => {

            console.log(
                "Announcement portal membership changed - refreshing portals"
            );

            loadPortals();

        };


        const handleAnnouncementCreated = (data) => {

            console.log(
                "Realtime announcement:created received:",
                data
            );

            if (
                selectedPortal?._id &&
                data?.portalId === selectedPortal._id &&
                data?.announcement
            ) {
                setAnnouncements((prev) => {
                    const exists = prev.some(
                        (a) => a._id === data.announcement._id
                    );

                    if (exists) return prev;

                    return [data.announcement, ...prev];
                });
            }

        };


        const handleAnnouncementUpdated = (data) => {

            console.log(
                "Realtime announcement:updated received:",
                data
            );

            if (
                selectedPortal?._id &&
                data?.portalId === selectedPortal._id &&
                data?.announcement
            ) {
                setAnnouncements((prev) =>
                    prev.map((a) =>
                        a._id === data.announcement._id
                            ? data.announcement
                            : a
                    )
                );
            }

        };


        const handleAnnouncementDeleted = (data) => {

            console.log(
                "Realtime announcement:deleted received:",
                data
            );

            if (
                selectedPortal?._id &&
                data?.portalId === selectedPortal._id &&
                data?.announcementId
            ) {
                setAnnouncements((prev) =>
                    prev.filter(
                        (a) => a._id !== data.announcementId
                    )
                );
            }

        };


        socket.on(
            "announcement:portal-created",
            handlePortalCreated
        );

        socket.on(
            "announcement:portal-deleted",
            handlePortalDeleted
        );

        socket.on(
            "announcement:member-added",
            handlePortalMemberChanged
        );

        socket.on(
            "announcement:member-removed",
            handlePortalMemberChanged
        );

        socket.on(
            "announcement:member-role-updated",
            handlePortalMemberChanged
        );

        socket.on(
            "announcement:created",
            handleAnnouncementCreated
        );

        socket.on(
            "announcement:updated",
            handleAnnouncementUpdated
        );

        socket.on(
            "announcement:deleted",
            handleAnnouncementDeleted
        );


        return () => {

            socket.off(
                "announcement:portal-created",
                handlePortalCreated
            );

            socket.off(
                "announcement:portal-deleted",
                handlePortalDeleted
            );

            socket.off(
                "announcement:member-added",
                handlePortalMemberChanged
            );

            socket.off(
                "announcement:member-removed",
                handlePortalMemberChanged
            );

            socket.off(
                "announcement:member-role-updated",
                handlePortalMemberChanged
            );

            socket.off(
                "announcement:created",
                handleAnnouncementCreated
            );

            socket.off(
                "announcement:updated",
                handleAnnouncementUpdated
            );

            socket.off(
                "announcement:deleted",
                handleAnnouncementDeleted
            );

        };

    }, [userId, selectedPortal?._id]);
    /*
     * --------------------------------------------------
     * Load portal members
     * --------------------------------------------------
     */

    useEffect(() => {

        setShowMembers(false);
        setShowPortalMenu(false);
        setShowAddMember(false);
        setSelectedNewMembers([]);

        if (
            !selectedPortal?._id ||
            !currentUser?.userId
        ) {
            setPortalMembers([]);
            return;
        }

        const loadPortalMembers = async () => {

            try {

                setMembersLoading(true);

                const members =
                    await getAnnouncementPortalMembers(
                        selectedPortal._id,
                        currentUser.userId,
                        platformId
                    );

                setPortalMembers(members);

            } catch (error) {

                console.error(
                    "Failed to load portal members:",
                    error
                );

                setPortalMembers([]);

            } finally {

                setMembersLoading(false);

            }
        };

        loadPortalMembers();

    }, [
        selectedPortal?._id,
        currentUser?.userId,
    ]);


    /*
     * --------------------------------------------------
     * Initial portal load
     * --------------------------------------------------
     */

    useEffect(() => {

        loadPortals();

    }, [userId]);


    /*
     * --------------------------------------------------
     * Load announcements when portal changes
     * --------------------------------------------------
     */

    useEffect(() => {

        if (
            !selectedPortal ||
            !userId
        ) {

            setAnnouncements([]);

            return;
        }

        const loadAnnouncements = async () => {

            try {

                setLoadingAnnouncements(true);
                setError("");

                const data =
                    await getAnnouncements(
                        selectedPortal._id,
                        userId,
                        platformId
                    );

                setAnnouncements(data);

            } catch (error) {

                console.error(
                    "Failed to load announcements:",
                    error
                );

                console.error(
                    "Status:",
                    error?.response?.status
                );

                console.error(
                    "Backend response:",
                    error?.response?.data
                );

                setError(
                    error?.response?.data?.message ||
                    "Failed to load announcements"
                );

            } finally {

                setLoadingAnnouncements(false);

            }
        };

        loadAnnouncements();

    }, [
        selectedPortal,
        userId,
    ]);
    

    /*
    * --------------------------------------------------
    * Announcement WebRTC connection
    * --------------------------------------------------
    */

    useEffect(() => {

        if (
            !selectedPortal?._id ||
            !userId
        ) {
            return;
        }

        const socket =
            getSocket();

        const portalId =
            selectedPortal._id;


        const createPeerConnection = (
            remoteUserId
        ) => {

            if (
                peerConnectionRef.current
            ) {
                return peerConnectionRef.current;
            }

            remoteUserRef.current =
                remoteUserId;


            const peerConnection =
                new RTCPeerConnection({
                    iceServers: [
                        {
                            urls:
                                "stun:stun.l.google.com:19302",
                        },
                    ],
                });


            peerConnection.onicecandidate =
                (event) => {

                    if (
                        !event.candidate
                    ) {
                        return;
                    }

                    sendAnnouncementIceCandidate(
                        portalId,
                        userId,
                        event.candidate
                    );
                };


            peerConnection.onconnectionstatechange =
                () => {

                    console.log(
                        "Announcement WebRTC state:",
                        peerConnection.connectionState
                    );

                };


            peerConnectionRef.current =
                peerConnection;

            return peerConnection;
        };


        /*
        * Someone joined the portal.
        * We become the caller.
        */

        const handleUserJoined = async (
            data
        ) => {

            console.log(
                "Announcement RTC user joined:",
                data
            );

            const peerConnection =
                createPeerConnection(
                    data.userId
                );

            const offer =
                await peerConnection.createOffer();

            await peerConnection.setLocalDescription(
                offer
            );

            sendAnnouncementOffer(
                portalId,
                userId,
                offer
            );
        };


        /*
        * Receive offer.
        * We become the answerer.
        */

        const handleOffer = async (
            data
        ) => {

            console.log(
                "Announcement RTC offer received:",
                data
            );

            const peerConnection =
                createPeerConnection(
                    data.userId
                );

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    data.offer
                )
            );

            const answer =
                await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(
                answer
            );

            sendAnnouncementAnswer(
                portalId,
                userId,
                answer
            );
        };


        /*
        * Receive answer.
        */

        const handleAnswer = async (
            data
        ) => {

            console.log(
                "Announcement RTC answer received:",
                data
            );

            const peerConnection =
                peerConnectionRef.current;

            if (!peerConnection) {
                return;
            }

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    data.answer
                )
            );
        };


        /*
        * Receive ICE candidate.
        */

        const handleIceCandidate = async (
            data
        ) => {

            const peerConnection =
                peerConnectionRef.current;

            if (
                !peerConnection ||
                !data.candidate
            ) {
                return;
            }

            try {

                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(
                        data.candidate
                    )
                );

            } catch (error) {

                console.error(
                    "Failed to add ICE candidate:",
                    error
                );

            }
        };


        const handleUserLeft = (
            data
        ) => {

            console.log(
                "Announcement RTC user left:",
                data
            );

            if (
                peerConnectionRef.current
            ) {

                peerConnectionRef.current.close();

                peerConnectionRef.current =
                    null;

            }

            remoteUserRef.current =
                null;
        };


        socket.on(
            "announcement:userJoined",
            handleUserJoined
        );

        socket.on(
            "announcement:userLeft",
            handleUserLeft
        );

        socket.on(
            "announcement:offer",
            handleOffer
        );

        socket.on(
            "announcement:answer",
            handleAnswer
        );

        socket.on(
            "announcement:ice-candidate",
            handleIceCandidate
        );


        joinAnnouncementRTC(
            portalId,
            userId
        );


        return () => {

            leaveAnnouncementRTC(
                portalId,
                userId
            );

            socket.off(
                "announcement:userJoined",
                handleUserJoined
            );

            socket.off(
                "announcement:userLeft",
                handleUserLeft
            );

            socket.off(
                "announcement:offer",
                handleOffer
            );

            socket.off(
                "announcement:answer",
                handleAnswer
            );

            socket.off(
                "announcement:ice-candidate",
                handleIceCandidate
            );


            if (
                peerConnectionRef.current
            ) {

                peerConnectionRef.current.close();

                peerConnectionRef.current =
                    null;

            }

            remoteUserRef.current =
                null;

        };

    }, [
        selectedPortal?._id,
        userId,
    ]);


    /*
     * --------------------------------------------------
     * Create portal
     * --------------------------------------------------
     */

    const handleCreatePortal = async ({
        name,
        description,
        targetAudience,
        members,
    }) => {

        try {

            setError("");

            const createdPortal =
                await createAnnouncementPortal({

                    name,

                    description,

                    userId,

                    role: userRole,

                    targetAudience,

                    members,
                    platformId,

                });


            /*
             * Refresh portal list.
             */

            await loadPortals();


            /*
             * Select newly created portal.
             */

            setSelectedPortal(
                createdPortal
            );

            setIsCreatePortalOpen(
                false
            );

        } catch (error) {

            console.error(
                "Failed to create portal:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "Failed to create announcement portal"
            );

            throw error;
        }
    };


    /*
     * --------------------------------------------------
     * Create announcement
     * --------------------------------------------------
     */

    const handleCreateAnnouncement = async ({
        title,
        content,
        targetAudience,
        targetUserIds,
        files = [],
    }) => {

        if (!selectedPortal) {
            return;
        }

        try {

            setError("");

            const formData =
                new FormData();


            formData.append(
                "senderId",
                userId
            );

            formData.append(
                "title",
                title
            );

            formData.append(
                "content",
                content
            );

            formData.append(
                "targetAudience",
                targetAudience
            );


            /*
             * Selected users
             */

            if (
                targetAudience === "selected" &&
                Array.isArray(targetUserIds)
            ) {

                targetUserIds
                    .filter(Boolean)
                    .forEach(
                        (targetUserId) => {

                            formData.append(
                                "targetUserIds",
                                targetUserId
                            );

                        }
                    );
            }


            /*
             * Attachments
             */

            files.forEach(
                (file) => {

                    formData.append(
                        "attachments",
                        file
                    );

                }
            );


            console.log(
                "Creating announcement:",
                {
                    portalId:
                        selectedPortal._id,

                    targetAudience,

                    targetUserIds,
                }
            );


            const announcement =
                await createAnnouncement(
                    selectedPortal._id,
                    formData,
                    platformId
                );


            setAnnouncements(
                (prev) => [
                    announcement,
                    ...prev,
                ]
            );

            setIsCreateAnnouncementOpen(
                false
            );

        } catch (error) {

            console.error(
                "Failed to create announcement:",
                error
            );

            console.error(
                "Status:",
                error?.response?.status
            );

            console.error(
                "Backend response:",
                error?.response?.data
            );

            setError(
                error?.response?.data?.message ||
                "Failed to create announcement"
            );

            throw error;
        }
    };


    /*
     * --------------------------------------------------
     * Delete announcement
     * --------------------------------------------------
     */

    const handleDeleteAnnouncement = async (
        announcementId
    ) => {

        if (!selectedPortal) {
            return;
        }

        try {

            setError("");

            await deleteAnnouncement(
                selectedPortal._id,
                announcementId,
                userId,
                platformId
            );

            setAnnouncements(
                (prev) =>
                    prev.filter(
                        (announcement) =>
                            announcement._id !==
                            announcementId
                    )
            );

        } catch (error) {

            console.error(
                "Failed to delete announcement:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "Failed to delete announcement"
            );
        }
    };

    /*
    * --------------------------------------------------
    * Add portal members
    * --------------------------------------------------
    */

    const handleAddPortalMembers = async () => {

        if (
            !selectedPortal ||
            selectedNewMembers.length === 0
        ) {
            return;
        }

        if (
            selectedPortal.role !== "host" &&
            selectedPortal.role !== "admin" &&
            selectedPortal.createdBy !== userId &&
            currentUser?.role !== "admin"
        ) {
            return;
        }

        try {

            setAddingMembers(true);
            setError("");

            const membersToAdd =
                selectedNewMembers.map((userId) => ({
                    userId,
                    role: "participant",
                }));

            await addPortalMembers(
                selectedPortal._id,
                membersToAdd,
                userId,
                platformId
            );

            const members =
                await getAnnouncementPortalMembers(
                    selectedPortal._id,
                    userId,
                    platformId
                );

            setPortalMembers(members);

            await loadPortals();

            setSelectedNewMembers([]);
            setShowAddMember(false);

        } catch (error) {

            console.error(
                "Add portal members error:",
                error.response?.data || error
            );

            setError(
                error.response?.data?.message ||
                "Failed to add members"
            );

        } finally {

            setAddingMembers(false);

        }
    };



    /*
     * --------------------------------------------------
     * Remove portal member
     * --------------------------------------------------
     */

    const handleRemovePortalMember = async (
        member
    ) => {

        if (!selectedPortal) {
            return;
        }


        /*
         * Only host/admin can remove members.
         */

        if (
            selectedPortal.role !== "host" &&
            selectedPortal.role !== "admin" &&
            selectedPortal.createdBy !== userId &&
            currentUser?.role !== "admin"
        ) {
            return;
        }


        /*
         * Host cannot remove themselves.
         */

        if (
            member.userId ===
            selectedPortal.createdBy
        ) {
            return;
        }


        const memberUser =
            users.find(
                (user) =>
                    user.userId === member.userId
            );

        const displayName =
            memberUser?.displayName ||
            member.userId;

        const confirmed =
            window.confirm(
                `Are you sure you want to remove ${displayName} from this portal?`
            );


        if (!confirmed) {
            return;
        }


        try {

            setError("");


            await removePortalMember(
                selectedPortal._id,
                member.userId,
                userId,
                platformId
            );


            /*
             * Immediately update member list.
             */

            setPortalMembers(
                (prev) =>
                    prev.filter(
                        (existingMember) =>
                            existingMember.userId !==
                            member.userId
                    )
            );


            /*
             * Refresh portals so that
             * access state stays accurate.
             */

            await loadPortals();


        } catch (error) {

            console.error(
                "Failed to remove portal member:",
                error
            );


            setError(
                error?.response?.data?.message ||
                "Failed to remove portal member"
            );

        }
    };


    /*
     * --------------------------------------------------
     * No user
     * --------------------------------------------------
     */

    if (!userId) {

        return (

            <div className="announcement-portal">

                <div className="announcement-empty">

                    <h3>
                        User information unavailable
                    </h3>

                </div>

            </div>

        );
    }


    /*
     * --------------------------------------------------
     * Loading
     * --------------------------------------------------
     */

    if (loadingPortals) {

        return (

            <div className="announcement-portal">

                <div className="announcement-loading">

                    Loading announcements...

                </div>

            </div>

        );
    }


    return (

        <div className="announcement-portal">


            {/* =========================================
                Header
            ========================================== */}

            <div className="announcement-header">

                <div className="announcement-header-left">

                    <button
                        type="button"
                        className="announcement-back-button"
                        onClick={onBack}
                    >
                        ←
                    </button>


                    <div>

                        <h2>
                            Announcements
                        </h2>

                        <p>
                            Stay updated with the latest
                            announcements.
                        </p>

                    </div>

                </div>


                {/* Host/Admin can create portals */}

                {(userRole === "admin" ||
                    userRole === "host") && (

                    <button
                        type="button"
                        className="announcement-create-portal-button"
                        onClick={() =>
                            setIsCreatePortalOpen(
                                true
                            )
                        }
                    >
                        + Portal
                    </button>

                )}

            </div>


            {/* =========================================
                Portal selector
            ========================================== */}

            <PortalList
                portals={portals}
                selectedPortal={selectedPortal}
                onSelect={(portal) => {
                    setSelectedPortal(portal);
                    setShowScreenShare(false);
                    setShowMembers(false);
                    setShowPortalMenu(false);
                    setShowAddMember(false);
                    setSelectedNewMembers([]);
                }}
            />


            {/* =========================================
                Error
            ========================================== */}

            {error && (

                <div className="announcement-error">

                    {error}

                </div>

            )}


            {/* =========================================
                No portals
            ========================================== */}

            {portals.length === 0 && (

                <div className="announcement-empty">

                    <div className="announcement-empty-icon">
                        📢
                    </div>


                    <h3>
                        No announcement portals
                    </h3>


                    <p>
                        You are not a member of any
                        announcement portal yet.
                    </p>

                </div>

            )}


            {/* =========================================
                Selected portal
            ========================================== */}

            {selectedPortal && (

                <div className="announcement-content">

                    <PortalHeader
                        portal={selectedPortal}
                        memberCount={portalMembers.length}
                        showMembers={showMembers}
                        showPortalMenu={showPortalMenu}
                        canManage={
                            selectedPortal.role === "host"
                        }
                        showScreenShare={showScreenShare}

                        onToggleScreenShare={() =>
                            setShowScreenShare(
                                (prev) => !prev
                            )
                        }
                        onCreateAnnouncement={() =>
                            setIsCreateAnnouncementOpen(
                                true
                            )
                        }
                        onToggleMenu={() =>
                            setShowPortalMenu(
                                (prev) => !prev
                            )
                        }
                        onToggleMembers={() => {
                            setShowMembers(
                                (prev) => !prev
                            );

                            setShowPortalMenu(false);
                        }}
                        onAddMembers={() => {
                            setShowAddMember(true);
                            setShowMembers(true);
                            setShowPortalMenu(false);
                        }}
                        onDeletePortal={() => {
                            setShowPortalMenu(false);
                            handleDeletePortal();
                        }}

                        onClose={() => setSelectedPortal(null)}
                    />


                    <PortalMembers
                        members={portalMembers}
                        users={users}
                        currentUserId={userId}
                        portal={selectedPortal}
                        loading={membersLoading}
                        show={showMembers}
                        showAddMember={showAddMember}
                        availableMembers={
                            availablePortalMembers
                        }
                        selectedNewMembers={
                            selectedNewMembers
                        }
                        addingMembers={addingMembers}
                        onClose={() =>
                            setShowMembers(false)
                        }
                        onRoleChange={
                            handleRoleChange
                        }
                        onRemove={
                            handleRemovePortalMember
                        }
                        onToggleNewMember={(
                            memberUserId
                        ) => {

                            setSelectedNewMembers(
                                (prev) =>
                                    prev.includes(
                                        memberUserId
                                    )
                                        ? prev.filter(
                                            (id) =>
                                                id !==
                                                memberUserId
                                        )
                                        : [
                                            ...prev,
                                            memberUserId,
                                        ]
                            );

                        }}
                        onAddMembers={
                            handleAddPortalMembers
                        }
                        onCloseAddMember={() => {
                            if (!addingMembers) {
                                setShowAddMember(false);
                                setSelectedNewMembers([]);
                            }
                        }}
                    />

                    {/* NORMAL ANNOUNCEMENT SPACE */}

                    {!showScreenShare && (
                        <PortalAnnouncements
                            announcements={announcements}
                            selectedPortal={selectedPortal}
                            loading={loadingAnnouncements}
                            onDelete={handleDeleteAnnouncement}
                            onEdit={handleEditAnnouncement}
                            userId={userId}
                            platformId={platformId}
                        />
                    )}


                    {/*  SCREEN SHARE SPACE */}

                    {showScreenShare && (
                        <div className="rtc-screen-share-space visible">
                            <ScreenShare
                                conversationId={selectedPortal._id}
                                currentUser={currentUser}
                                participantIds={portalMembers}
                                booleanConnection={showScreenShare}
                            />
                        </div>
                    )}


                </div>

            )}


            {/* =========================================
                Create Portal Modal
            ========================================== */}

            <CreatePortalModal
                isOpen={
                    isCreatePortalOpen
                }
                onClose={() =>
                    setIsCreatePortalOpen(
                        false
                    )
                }
                onCreate={
                    handleCreatePortal
                }
                users={
                    users
                }
                currentUser={
                    currentUser
                }
            />


            {/* =========================================
                Create Announcement Modal
            ========================================== */}

            <CreateAnnouncementModal
                isOpen={
                    isCreateAnnouncementOpen
                }
                onClose={() =>
                    setIsCreateAnnouncementOpen(
                        false
                    )
                }
                
                onCreate={
                    handleCreateAnnouncement
                }
                users={
                    announcementUsers
                }
                currentUser={
                    currentUser
                }
            />


            {/* =========================================
                Edit Announcement Modal
            ========================================== */}

            {editingAnnouncement && (

                <EditAnnouncementModal
                    isOpen={
                        Boolean(
                            editingAnnouncement
                        )
                    }
                    announcement={
                        editingAnnouncement
                    }
                    onClose={() =>
                        setEditingAnnouncement(
                            null
                        )
                    }
                    onUpdate={
                        handleUpdateAnnouncement
                    }
                />

            )}

        </div>

    );
}


export default AnnouncementPortal;