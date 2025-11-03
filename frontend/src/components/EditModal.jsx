import React, { useEffect, useState } from "react";

import toast from "react-hot-toast";

import host from "../host";
import { axiosInstance as axios } from "../utils/axios";
import Modal from "./Modal";

export default function EditModal({ onClose, server, onSaved }) {
  const [name, setName] = useState(server?.name || "");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setName(server?.name || "");
  }, [server]);

  const save = async () => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("name", name);
      if (file) form.append("image", file);
      await axios.put(`${host}/server/${server?._id}`, form);
      toast.success("Saved");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h1>Edit Server</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0])}
      />
      <button onClick={save} disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </button>
    </Modal>
  );
}
