// src/components/Channels.jsx
/* eslint-disable react/prop-types */
import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";
import { AiFillDelete } from "react-icons/ai";
import {
  FaAngleDown,
  FaAngleRight,
  FaHashtag,
} from "react-icons/fa6";
import { FiEdit2 } from "react-icons/fi";
import { IoLogOutOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import host from "../host";
import { axiosInstance as axios } from "../utils/axios";

const Channels = ({ data = [] }) => {
  const [showChannels, setShowChannels] = useState(false);
  const [currentChannel, setCurrentChannel] = useState("");
  const [channels, setChannels] = useState(data || []);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [targetChannel, setTargetChannel] = useState(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${host}/profile`);
      setUserProfile(res.data.user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    setChannels(data || []);
  }, [data]);
  const userId = userProfile?._id;

  const handleNavigate = (_id) => {
    setCurrentChannel(_id);
    navigate("/channel/" + _id);
  };

  const openDeleteModal = (c) => {
    setTargetChannel(c);
    setShowDeleteModal(true);
  };

  const doDelete = async () => {
    if (!targetChannel) return;
    setLoading(true);
    try {
      const res = await axios.delete(`${host}/channel/${targetChannel._id}`);
      // optimistic UI: remove
      setChannels((prev) =>
        prev.filter((ch) => String(ch._id) !== String(targetChannel._id)),
      );
      if (String(currentChannel) === String(targetChannel._id)) {
        setCurrentChannel("");
        navigate("/");
      }
      toast.success(res.data?.message || "Channel deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setTargetChannel(null);
    }
  };

  const openEditModal = (c) => {
    setTargetChannel(c);
    setEditName(c.name || "");
    setShowEditModal(true);
  };

  const doEdit = async () => {
    if (!targetChannel) return;
    const trimmed = (editName || "").trim();
    if (!trimmed) {
      toast.error("Channel name cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.put(`${host}/channel/${targetChannel._id}`, {
        name: trimmed,
      });
      // optimistic update locally
      setChannels((prev) =>
        prev.map((ch) =>
          String(ch._id) === String(targetChannel._id)
            ? { ...ch, name: trimmed }
            : ch,
        ),
      );
      toast.success(res.data?.message || "Channel updated");
      setShowEditModal(false);
      setTargetChannel(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (channelId) => {
    // call backend leave endpoint; backend may delete channel if it was last member
    try {
      const res = await axios.post(`${host}/channel/${channelId}/leave`);
      const { channelDeleted } = res.data || {};
      if (channelDeleted) {
        // remove from UI
        setChannels((prev) =>
          prev.filter((c) => String(c._id) !== String(channelId)),
        );
        if (String(currentChannel) === String(channelId)) {
          setCurrentChannel("");
          navigate("/");
        }
        toast.success(
          "You left the channel. Channel deleted (no members left).",
        );
      } else {
        // still present
        toast.success(res.data?.message || "You left the channel");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to leave channel");
    }
  };

  // NEW: subscribe to socket events so channels list updates in real-time
  useEffect(() => {
    const sock = io(host);

    const onChannelDeleted = ({ _id }) => {
      if (!_id) return;
      setChannels((prev) => prev.filter((c) => String(c._id) !== String(_id)));
      if (String(currentChannel) === String(_id)) {
        setCurrentChannel("");
        navigate("/");
      }
      // optional toast for live changes
      toast.error("A channel was deleted");
    };

    const onChannelUpdated = (payload) => {
      if (!payload || !payload._id) return;
      setChannels((prev) =>
        prev.map((ch) =>
          String(ch._id) === String(payload._id)
            ? {
                ...ch,
                name: payload.name ?? ch.name,
                members: payload.members ?? ch.members,
              }
            : ch,
        ),
      );
    };

    sock.on("channelDeleted", onChannelDeleted);
    sock.on("channelUpdated", onChannelUpdated);

    return () => {
      sock.off("channelDeleted", onChannelDeleted);
      sock.off("channelUpdated", onChannelUpdated);
      sock.disconnect();
    };
    // run once
  }, [currentChannel, navigate]);

  return (
    <div className="m-2 flex flex-col p-2">
      <div
        onClick={() => setShowChannels((s) => !s)}
        className="flex cursor-pointer items-center gap-2 text-slate-300"
      >
        {!showChannels ? <FaAngleRight /> : <FaAngleDown />}
        <p className="text-sm font-semibold">Text Channels</p>
      </div>

      {showChannels && (
        <ul className="flex flex-col gap-2 p-3">
          {channels.map((c) => {
            const { name, _id, createdBy } = c;

            const amCreator = createdBy && String(createdBy) === String(userId);
            return (
              <li
                key={_id}
                className={`flex items-center justify-between gap-3 rounded-xl p-2 text-slate-300 hover:bg-slate-700 ${
                  currentChannel === _id ? "bg-slate-800 text-slate-50" : ""
                }`}
              >
                <div
                  className="flex cursor-pointer items-center gap-3"
                  onClick={() => handleNavigate(_id)}
                >
                  <FaHashtag className="text-lg" />
                  <p className="text-sm font-semibold">{name}</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Leave button */}
                  <button
                    onClick={() => handleLeave(_id)}
                    title="Leave channel"
                    className="rounded px-2 py-1 text-xs hover:bg-slate-700"
                  >
                    <IoLogOutOutline />
                  </button>

                  {/* Edit button shown only to creator */}
                  {amCreator && (
                    <button
                      onClick={() => openEditModal(c)}
                      title="Edit channel"
                      className="rounded px-2 py-1 text-xs hover:bg-slate-700"
                    >
                      <FiEdit2 />
                    </button>
                  )}

                  {/* Delete button shown only to creator */}
                  {amCreator && (
                    <button
                      onClick={() => openDeleteModal(c)}
                      title="Delete channel"
                      className="rounded px-2 py-1 text-xs hover:bg-slate-700 hover:text-red-400"
                    >
                      <AiFillDelete />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete modal */}
      {showDeleteModal && targetChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-slate-800 p-6 text-slate-100 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">Delete channel</h3>
            <p className="mb-4 text-sm text-slate-300">
              Are you sure you want to delete{" "}
              <strong>{targetChannel.name}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTargetChannel(null);
                }}
                className="rounded-md bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && targetChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-slate-800 p-6 text-slate-100 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">Edit channel</h3>
            <p className="mb-2 text-sm text-slate-300">Rename channel: </p>
            <input
              className="mb-4 w-full rounded bg-slate-700 px-3 py-2 text-sm outline-none"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Channel name"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setTargetChannel(null);
                }}
                className="rounded-md bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={doEdit}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Channels;
