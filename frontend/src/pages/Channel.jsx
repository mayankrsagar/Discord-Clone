// src/components/Channel.jsx
import {
  useEffect,
  useRef,
  useState,
} from "react";

import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";
import { AiFillDelete } from "react-icons/ai";
import { BsFillEmojiSmileFill } from "react-icons/bs";
import {
  FaArrowLeft,
  FaHashtag,
} from "react-icons/fa6";
import {
  IoAddOutline,
  IoCloseOutline,
  IoLogOutOutline,
  IoSend,
} from "react-icons/io5";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { io } from "socket.io-client";
import useSWR from "swr";

import host from "../host";
import { axiosInstance as axios } from "../utils/axios";
import Message from "./Message";

const generateTempId = () =>
  `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const Channel = () => {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [message, setMessage] = useState("");
  const [emojis, setEmojis] = useState(false);
  const [channel, setChannel] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [user, setUser] = useState(null);
  // new: local state for delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // NEW: loading state for channel fetch
  const [channelLoading, setChannelLoading] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useRef(null);
  const listRef = useRef(null);
  const dropRef = useRef(null);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${host}/profile`);
      setUser(res.data.user);
    } catch (error) {
      console.log("Failed to fetch user profile:", error);
    }
  };

  const fetcher = (url) => axios.get(url).then((res) => res.data?.messages);
  const {
    data: messages,
    isLoading,
    error,
    mutate,
  } = useSWR(id ? `${host}/messages/${id}` : null, fetcher, {
    onError: (err) => toast.error(err?.message || "Failed to load messages"),
    revalidateOnFocus: false,
  });

  // fetch channel details only when id changes
  useEffect(() => {
    if (!id) {
      setChannel({});
      return;
    }
    let cancelled = false;
    const fetchChannel = async () => {
      setChannelLoading(true);
      try {
        const res = await axios.get(`${host}/channel/${id}`);
        if (!cancelled) setChannel(res.data?.channel ?? {});
      } catch (e) {
        if (!cancelled)
          toast.error(e?.response?.data?.message || "Channel error");
      } finally {
        if (!cancelled) setChannelLoading(false);
      }
    };
    fetchChannel();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // socket: attach once for the current channel id (recreate when id changes)
  useEffect(() => {
    if (!id) return;
    const sock = io(host);
    socket.current = sock;
    sock.emit("joinChannel", { channelId: id });

    const onMessage = (msg) => {
      mutate((old = []) => {
        if (!msg?._id) {
          const transient = {
            ...msg,
            _id: `transient-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 6)}`,
          };
          return [...old.filter(Boolean), transient];
        }
        if (old.some((m) => m._id === msg._id)) return old;
        return [...old, msg];
      }, false);
    };

    const onEdited = (payload) =>
      mutate(
        (old = []) =>
          old.map((m) => (m._id === payload._id ? { ...m, ...payload } : m)),
        false,
      );
    const onDeleted = ({ _id }) =>
      mutate((old = []) => old.filter((m) => m._id !== _id), false);

    sock.on("message", onMessage);
    sock.on("messageEdited", onEdited);
    sock.on("messageDeleted", onDeleted);

    // listen for channel metadata updates and deletions
    const onChannelUpdated = (payload) => {
      if (!payload) return;
      if (payload._id && String(payload._id) !== String(id)) return;
      // update members and name if provided
      setChannel((prev) => ({
        ...prev,
        name: payload.name ?? prev.name,
        members: payload.members ?? prev.members,
      }));
    };

    const onChannelDeleted = ({ _id }) => {
      if (!_id) return;
      if (String(_id) !== String(id)) return;
      toast.error("Channel was deleted");
      // leave local room and navigate away
      try {
        if (socket.current)
          socket.current.emit("leaveChannel", { channelId: id });
      } catch (e) {
        /* ignore */
        console.log(e);
      }
      navigate("/");
    };

    sock.on("channelUpdated", onChannelUpdated);
    sock.on("channelDeleted", onChannelDeleted);

    return () => {
      sock.emit("leaveChannel", { channelId: id });
      sock.off("message", onMessage);
      sock.off("messageEdited", onEdited);
      sock.off("messageDeleted", onDeleted);
      sock.off("channelUpdated", onChannelUpdated);
      sock.off("channelDeleted", onChannelDeleted);
      sock.disconnect();
      socket.current = null;
    };
    // only recreate socket when id changes
  }, [id, mutate, navigate]);

  // auto-scroll on messages change (simple behavior)
  useEffect(() => {
    if (!listRef.current) return;
    const t = setTimeout(() => {
      try {
        const el = listRef.current;
        el.scrollTop = el.scrollHeight;
      } catch (e) {
        console.log(e);
      }
    }, 80);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    if (!file) {
      setFilePreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore
        console.log(e);
      }
      setFilePreview("");
    };
  }, [file]);

  // drag & drop handlers
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const onDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      el.classList.add("ring-2", "ring-offset-2", "ring-slate-600");
    };
    const onDragLeave = (e) => {
      e.preventDefault();
      el.classList.remove("ring-2", "ring-offset-2", "ring-slate-600");
    };
    const onDrop = (e) => {
      e.preventDefault();
      el.classList.remove("ring-2", "ring-offset-2", "ring-slate-600");
      const f = e.dataTransfer.files?.[0] ?? null;
      if (f) {
        if (!f.type.startsWith("image/")) {
          toast.error("Only images are allowed");
          return;
        }
        setFile(f);
      }
    };

    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    fetchUser();
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Only images are allowed");
      return;
    }
    setFile(f);
  };

  const cancelFile = () => {
    if (filePreview) {
      try {
        URL.revokeObjectURL(filePreview);
      } catch (e) {
        // ignore
        console.log(e);
      }
    }
    setFile(null);
    setFilePreview("");
  };

  let userId = user?._id;
  let username = user?.username;

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text && !file) return;
    if (!id) return;

    const tempId = generateTempId();
    const previewUrl = file ? filePreview || URL.createObjectURL(file) : null;

    const tempMsg = {
      _id: tempId,
      __temp: true,
      message: text,
      userId,
      username,
      date: new Date().toISOString(),
      imageUrl: previewUrl,
      uploadProgress: file ? 0 : undefined,
    };

    // optimistic add
    mutate((old = []) => [...old, tempMsg], false);
    setMessage("");
    const sentFile = file;
    setFile(null);
    setFilePreview("");

    setIsUploading(Boolean(sentFile));
    setUploadProgress(sentFile ? 0 : 100);

    try {
      const fd = new FormData();
      fd.append("channelId", id);
      fd.append("message", text);
      fd.append("date", new Date().toISOString());
      if (sentFile) fd.append("file", sentFile);

      const res = await axios.post(`${host}/message`, fd, {
        onUploadProgress: (evt) => {
          if (!evt.lengthComputable) return;
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(percent);
          // update optimistic message progress
          mutate(
            (old = []) =>
              old.map((m) =>
                m._id === tempId ? { ...m, uploadProgress: percent } : m,
              ),
            false,
          );
        },
      });

      const created = res?.data?.data;
      if (created && created._id) {
        // replace temp with actual created message
        mutate((old = []) => {
          const withoutCreated = old.filter(
            (m) => m._id !== created._id && m._id !== tempId,
          );
          return [...withoutCreated, created];
        }, false);
      } else {
        // if server didn't return created message, mark temp as not-temp
        mutate(
          (old = []) =>
            old.map((m) => (m._id === tempId ? { ...m, __temp: false } : m)),
          false,
        );
      }
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e?.message || "Message not sent",
      );
      // rollback optimistic
      mutate((old = []) => old.filter((m) => m._id !== tempId), false);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (previewUrl && previewUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch (e) {
          // ignore
          console.log(e);
        }
      }
    }
  };

  const handleEmoji = (e) => setMessage((prev) => prev + e.emoji);

  // Channel remove / leave handlers
  const initiateDeleteChannel = () => {
    setShowDeleteConfirm(true);
  };
  const doDeleteChannel = async () => {
    if (!id) {
      setShowDeleteConfirm(false);
      return;
    }
    setIsDeleting(true);
    try {
      const res = await axios.delete(`${host}/channel/${id}`);
      toast.success(res.data?.message || "Channel deleted");
      setShowDeleteConfirm(false);
      navigate("/");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Delete failed");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const isJoined = () => {
    const members = channel?.members ?? [];
    return members.some((m) => String(m) === String(userId));
  };

  const handleLeaveChannel = async () => {
    try {
      const res = await axios.post(`${host}/channel/${id}/leave`);
      if (res.data?.channelDeleted) {
        toast.success("You left. Channel deleted (last member).");
        navigate("/");
        return;
      }
      toast.success(res.data?.message || "You left the channel");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to leave channel");
    } finally {
      try {
        if (socket.current)
          socket.current.emit("leaveChannel", { channelId: id });
      } catch (e) {
        // ignore
        console.log(e);
      }
    }
  };

  return (
    <div className="relative flex min-h-dvh min-w-[300px] flex-col bg-slate-900 text-slate-100">
      {/* header */}
      <div className="flex items-center gap-3 p-3">
        <FaArrowLeft
          onClick={() => navigate("/")}
          className="cursor-pointer text-xl text-slate-300"
        />
        <div className="flex items-center gap-2">
          <FaHashtag className="text-xl text-slate-300" />
          <p className="font-semibold">
            {channel.name ?? "Channel"}
            {/* small loading indicator next to the name */}
            {channelLoading && (
              <span
                className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"
                title="Loading channel..."
              />
            )}
          </p>

          <span className="ml-2 rounded-md bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
            {Array.isArray(channel.members) ? channel.members.length : 0}{" "}
            members
          </span>

          {isJoined() ? (
            <span className="ml-2 rounded-md bg-green-500 px-2 py-0.5 text-xs text-black">
              Joined
            </span>
          ) : (
            <span className="ml-2 rounded-md bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
              Not Joined
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleLeaveChannel}
            title="Leave channel"
            className="rounded p-2 hover:bg-slate-700"
          >
            <IoLogOutOutline />
          </button>

          {channel?.createdBy &&
            String(channel.createdBy) === String(userId) && (
              <button
                onClick={initiateDeleteChannel}
                title="Delete channel"
                className="rounded p-2 text-red-400 hover:bg-red-600"
              >
                <AiFillDelete />
              </button>
            )}
        </div>
      </div>

      {/* messages area */}
      <div className="flex w-full max-w-[800px] flex-grow flex-col justify-end self-center rounded-t-3xl bg-slate-800 p-4 pb-[140px]">
        <div className="flex w-full max-w-[600px] flex-col gap-2 self-center">
          <div className="w-fit rounded-full bg-slate-700 p-4 text-3xl">
            <FaHashtag />
          </div>
          <h1 className="text-3xl font-semibold">
            Welcome to{" "}
            <span className="first-letter:uppercase">{channel.name}</span>
          </h1>
          <p className="text-sm text-slate-300">
            This is your brand-new server.
          </p>
        </div>

        {isLoading && <p className="self-center text-sm">Loading messages…</p>}
        {error && (
          <p className="self-center text-sm text-red-400">
            Failed to load messages
          </p>
        )}

        <div
          ref={listRef}
          className="mt-4 flex w-full max-w-[600px] flex-col gap-4 self-center overflow-y-auto"
          style={{ maxHeight: "60vh" }}
        >
          <ul className="flex flex-col gap-4">
            {(messages || []).map((m) => (
              <Message
                key={m._id}
                mutate={mutate}
                userId={userId}
                data={m}
                user={user}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* input area (drag target) */}
      <div
        ref={dropRef}
        className="fixed inset-x-0 bottom-0 z-40 m-auto flex max-w-[600px] items-end gap-2 bg-slate-800 p-3"
      >
        <div className="flex items-center gap-2">
          <label
            htmlFor="file"
            className="bg-discord cursor-pointer rounded-full p-2 text-2xl text-white"
          >
            <IoAddOutline />
          </label>
          <input
            id="file"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex flex-grow flex-col gap-2">
          {filePreview && (
            <div className="flex items-center gap-2 rounded-md bg-slate-700 p-2">
              <img
                src={filePreview}
                alt="preview"
                className="h-16 w-24 rounded-md object-cover"
              />
              <div className="flex-1 text-sm text-slate-200">
                <div className="font-semibold">{file?.name}</div>
                <div className="text-xs text-slate-400">
                  {file ? `${Math.round(file.size / 1024)} KB` : ""}
                </div>
                {isUploading && (
                  <div className="mt-1 w-full rounded bg-slate-600">
                    <div
                      style={{ width: `${uploadProgress}%` }}
                      className="h-1 rounded bg-green-400"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={cancelFile}
                aria-label="Cancel image"
                className="p-2 text-slate-200"
              >
                <IoCloseOutline />
              </button>
            </div>
          )}

          <div className="flex items-center rounded-3xl bg-slate-900 px-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Message"
              className="h-[40px] w-[90%] bg-transparent pl-3 text-sm text-slate-200 outline-none"
            />
            <div className="relative flex h-[40px] w-[10%] items-center justify-center">
              {emojis ? (
                <IoCloseOutline
                  onClick={() => setEmojis(false)}
                  className="cursor-pointer text-2xl text-slate-200"
                />
              ) : (
                <BsFillEmojiSmileFill
                  onClick={() => setEmojis(true)}
                  className="cursor-pointer text-lg text-slate-200"
                />
              )}
              {emojis && (
                <div className="absolute right-0 bottom-[60px] z-50">
                  <EmojiPicker
                    theme="dark"
                    emojiStyle="google"
                    width={300}
                    height={350}
                    onEmojiClick={handleEmoji}
                    autoFocusSearch={false}
                    suggestedEmojisMode="recent"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSendMessage}
          className="bg-discord rounded-full p-2 text-2xl text-white"
        >
          <IoSend />
        </button>
      </div>

      {/* Simple confirmation modal — minimal, accessible, and styled with Tailwind */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-slate-800 p-6 text-slate-100 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">Delete channel</h3>
            <p className="mb-4 text-sm text-slate-300">
              Are you sure you want to delete this channel? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={doDeleteChannel}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Channel;
