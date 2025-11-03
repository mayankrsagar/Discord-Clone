import React, { useState } from "react";

import toast from "react-hot-toast";

import host from "../host";
import { axiosInstance as axios } from "../utils/axios";
import Modal from "./Modal";

export default function CreateChannelModal({ onClose, serverId, onCreated }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const token = document.cookie.includes("discordToken")
    ? document.cookie
    : null; // adjust if using Cookies lib

  const create = async () => {
    if (!name) return;
    setLoading(true);
    try {
      await axios.post(
        `${host}/channel`,
        { serverId, name },
        { headers: { Authorization: token } },
      );
      toast.success("Channel created");
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h1>Create Channel</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Channel name"
      />
      <button onClick={create} disabled={loading}>
        {loading ? "..." : "Create"}
      </button>
    </Modal>
  );
}
