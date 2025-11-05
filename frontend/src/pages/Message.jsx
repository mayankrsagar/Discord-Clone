// src/components/Message.jsx
/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState } from "react";

import dayjs from "dayjs";
import PropTypes from "prop-types";
import toast from "react-hot-toast";
import { AiFillDelete } from "react-icons/ai";
import { HiUser } from "react-icons/hi2";
import { LiaEdit } from "react-icons/lia";

import host from "../host";
import { axiosInstance as axios } from "../utils/axios";

const Message = ({ data, userId, mutate }) => {
  const { message, username, date, imageUrl, uploadProgress } = data;
  const [edit, setEdit] = useState(false);
  const [editMessage, setEditMessage] = useState(message ?? "");

  // is this optimistic temp message?
  const isTemp = String(data._id || "").startsWith("temp-");

  // Initialize editMessage when user explicitly opens edit mode
  const toggleEdit = () => {
    if (!edit) {
      setEditMessage(message ?? "");
      setEdit(true);
    } else {
      setEdit(false);
    }
  };

  const isMine = String(userId) === String(data.userId);

  const handleEdit = async () => {
    if (isTemp) {
      toast.error("Can't edit until message is saved", { duration: 2000 });
      setEdit(false);
      return;
    }

    const trimmed = (editMessage ?? "").trim();
    if (!trimmed || trimmed === (message ?? "").trim()) {
      setEdit(false);
      return;
    }
    try {
      const res = await axios.put(`${host}/message/${data._id}`, {
        message: trimmed,
        date: new Date(),
      });
      if (res.status === 200) {
        setEdit(false);
        if (mutate) await mutate();
        toast.success(res.data?.message || "Edited", { duration: 1000 });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Edit failed", {
        duration: 1000,
      });
    }
  };

  const handleDelete = async () => {
    if (isTemp) {
      // simply remove optimistic message locally
      if (mutate) {
        mutate((old = []) => old.filter((m) => m._id !== data._id), false);
      }
      toast.success("Message removed", { duration: 1000 });
      return;
    }

    try {
      const res = await axios.delete(`${host}/message/${data._id}`);
      if (res.status === 200) {
        if (mutate) await mutate();
        toast.success(res.data?.message || "Deleted", { duration: 1000 });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed", {
        duration: 1000,
      });
    }
  };

  return (
    <li
      className={`flex items-start gap-3 ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`mt-1 w-fit rounded-full p-3 text-2xl ${isMine ? "bg-discord" : "bg-slate-900"}`}
      >
        <HiUser />
      </div>

      <div
        className={`flex max-w-[80%] flex-col ${isMine ? "items-end" : "items-start"}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{username}</span>
          <span className="text-[10px] text-slate-400">
            {date ? dayjs(date).format("DD/MM/YYYY hh:mm A") : ""}
          </span>
        </div>

        <div
          className={`mt-1 rounded-xl p-3 ${isMine ? "bg-discord text-black" : "bg-slate-700 text-slate-100"}`}
        >
          {imageUrl && (
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-2 block"
            >
              <img
                src={imageUrl}
                alt="upload"
                className="max-w-[320px] rounded-md object-cover"
              />
            </a>
          )}

          {edit ? (
            <div className="flex items-center gap-2">
              <input
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                className="h-9 w-full bg-transparent text-sm outline-none"
                autoFocus
              />
              {editMessage.trim() !== (message ?? "").trim() &&
                editMessage.trim() && (
                  <button
                    onClick={handleEdit}
                    className="text-xs font-medium text-green-400"
                  >
                    Save
                  </button>
                )}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message}</p>
          )}

          {typeof uploadProgress === "number" && uploadProgress < 100 && (
            <div className="mt-2 w-full rounded bg-slate-600">
              <div
                style={{ width: `${uploadProgress}%` }}
                className="h-1 rounded bg-green-400"
              />
            </div>
          )}
        </div>

        {isMine && (
          <div className="mt-1 flex gap-2 text-sm">
            <button
              onClick={handleDelete}
              aria-label="Delete message"
              className="hover:text-discord"
            >
              <AiFillDelete />
            </button>
            <button
              onClick={toggleEdit}
              aria-label="Edit message"
              className="hover:text-discord"
            >
              <LiaEdit />
            </button>
          </div>
        )}
      </div>
    </li>
  );
};

Message.propTypes = {
  data: PropTypes.object.isRequired,
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  mutate: PropTypes.func.isRequired,
};

export default Message;
