/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from "react";

import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";
import { FaAngleRight, FaHashtag } from "react-icons/fa6";
import { GoDotFill } from "react-icons/go";
import { HiSpeakerWave } from "react-icons/hi2";
import { IoIosSettings } from "react-icons/io";
import {
  IoCloseCircle,
  IoNotifications,
  IoPersonAdd,
  IoSave,
} from "react-icons/io5";
import { LuComputer } from "react-icons/lu";
import { MdOutlineMailOutline, MdOutlineRestore } from "react-icons/md";
import { RiLink } from "react-icons/ri";
import { TailSpin } from "react-loader-spinner";
import { io } from "socket.io-client";
import useSWR from "swr";

import AlertModal from "../components/AlertModal";
import LeaveServer from "../components/LeaveServer";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import host from "../host";
import { axiosInstance as axios } from "../utils/axios";
import Channels from "./Channels";
import Friends from "./InviteFriends";

const ServerDetails = ({
  currentServer,
  mutate: serversMutate,
  setCurrentServer,
}) => {
  const [serverModal, setServerModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [createChannelModal, setCreateChannelModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [serverName, setServerName] = useState("");
  const [friendName, setFriendName] = useState("");
  const [alertModal, setAlertModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [editModal, setEditModal] = useState(false);

  // Edit modal states
  const [editName, setEditName] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const token = Cookies.get("discordToken");
  const { userId } = token ? jwtDecode(token) : { userId: null };
  const socket = useRef();

  // --- SWR for server (renamed to avoid collisions) ---
  const fetchServer = async (url) => {
    try {
      const res = await axios.get(url);
      if (res.status === 200) {
        return res.data.server;
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || "Failed";
      toast.error(msg, { duration: 1000 });
    }
  };

  const {
    data: server,
    isLoading: serverLoading,
    mutate: serverMutate,
  } = useSWR(
    currentServer ? host + "/server/" + currentServer : null,
    fetchServer,
  );

  // socket effect: watch currentServer and userId
  useEffect(() => {
    if (!currentServer || !userId) return;

    socket.current = io(host);

    socket.current.emit("userOnline", { serverId: currentServer, userId });

    socket.current.on("onlineUsersCount", (count) => {
      setOnlineUsers(count);
    });

    return () => {
      if (socket.current) {
        socket.current.off("onlineUsersCount");
        socket.current.disconnect();
        socket.current = null;
      }
      setOnlineUsers(0);
    };
  }, [currentServer, userId]);

  // when server finishes loading, set invite code if exists
  useEffect(() => {
    if (!serverLoading && server?.inviteCode) {
      setInviteCode(server.inviteCode);
    }
    if (!serverLoading && !server?.inviteCode) {
      setInviteCode("");
    }
  }, [serverLoading, server]);

  // initialize edit modal fields when opened
  useEffect(() => {
    if (editModal && server) {
      setEditName(server.name || "");
      setEditImageFile(null);
      setEditImagePreview(server.image || null);
    }
  }, [editModal, server]);

  // revoke preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (editImagePreview && editImageFile) {
        try {
          URL.revokeObjectURL(editImagePreview);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [editImagePreview, editImageFile]);

  const fetchChannels = async (url) => {
    try {
      const res = await axios.get(url);
      if (res.status === 200) {
        return res.data.channels;
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || "Failed";
      toast.error(msg, { duration: 1000 });
    }
  };

  const {
    data: channelsData,
    isLoading: channelsLoading,
    mutate: channelsMutate,
  } = useSWR(
    currentServer ? host + "/channels/" + currentServer : null,
    fetchChannels,
  );

  const handleCreateChannel = async () => {
    try {
      if (serverName.length === 0) return;
      setLoading(true);
      const url = host + "/channel";
      const res = await axios.post(
        url,
        {
          serverId: currentServer,
          name: serverName,
        },
        {
          headers: {
            Authorization: token,
          },
        },
      );

      if (res.status === 201) {
        toast.success(res.data.message, { duration: 1000 });
        setLoading(false);
        channelsMutate();
        setServerName("");
        setCreateChannelModal(false);
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || "Failed";
      toast.error(msg, { duration: 1000 });
      setLoading(false);
    }
  };

  function generateUniqueRandomString() {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }

    setInviteCode(result);
  }

  async function handleSaveInviteCode() {
    try {
      const url = host + "/server/invite/" + currentServer;

      const res = await axios.put(url, {
        inviteCode,
      });

      if (res.status === 200) {
        toast.success(res.data?.message, { duration: 1000 });
        serverMutate();
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || "Failed";
      toast.error(msg, { duration: 1000 });
    }
  }

  const handleDeleteServer = async () => {
    try {
      const url = host + "/server/" + currentServer;
      const res = await axios.delete(url, {
        headers: { Authorization: token },
      });
      if (res.status === 200) {
        toast.success(res.data?.message, { duration: 1000 });
        serversMutate();
        setAlertModal(false);
        setServerModal(false);
        setCurrentServer("discover");
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || "Failed";
      toast.error(msg, { duration: 1000 });
    }
  };

  // Edit image change
  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setEditImageFile(file);
    const url = URL.createObjectURL(file);
    setEditImagePreview(url);
  };

  const handleEditSave = async () => {
    try {
      const noNameChange = editName.trim() === (server?.name || "").trim();
      const noImageChange = !editImageFile;
      if (noNameChange && noImageChange) {
        setEditModal(false);
        return;
      }

      setEditLoading(true);

      const url = host + "/server/" + currentServer;
      const form = new FormData();
      form.append("name", editName);
      if (editImageFile) form.append("image", editImageFile);

      const res = await axios.put(url, form, {
        headers: {
          Authorization: token,
        },
      });

      if (res.status === 200) {
        toast.success(res.data?.message || "Server updated", {
          duration: 1200,
        });
        serverMutate();
        serversMutate();
        setEditModal(false);
      } else {
        toast.error("Unexpected response from server");
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message || error.message || "Update failed";
      toast.error(msg, { duration: 1200 });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <>
      <div
        style={{ width: "calc(100vw - 100px)" }}
        className="min-h-dvh min-w-[300px] flex-grow rounded-tl-[30px] bg-slate-900 text-white"
      >
        {serverLoading ? (
          <Loader />
        ) : (
          <div>
            <div className="flex flex-col border-b-2 border-slate-700 p-3 pl-5">
              <div
                onClick={() => setServerModal(true)}
                className="flex cursor-pointer items-center gap-2"
              >
                <h1 className="text-lg font-semibold">{server?.name} server</h1>
                <FaAngleRight className="text-xs text-slate-400" />
              </div>
            </div>

            {!channelsLoading && <Channels data={channelsData} />}
          </div>
        )}
      </div>

      {alertModal && (
        <AlertModal
          onClose={() => setAlertModal(false)}
          handleDeleteServer={handleDeleteServer}
          setAlertModal={setAlertModal}
        />
      )}

      {/* Server details modal*/}
      {serverModal && (
        <Modal onClose={() => setServerModal(false)}>
          {server?.image ? (
            <img
              className="mb-2 h-[60px] w-[60px] rounded-xl md:h-[80px] md:w-[80px]"
              src={server?.image}
              alt={server?.name}
            />
          ) : (
            <div className="bg-discord mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-full">
              <LuComputer className="text-2xl" />
            </div>
          )}
          <h1 className="mt-4 text-2xl font-semibold text-slate-100">
            {server?.name}
          </h1>

          <div className="mt-3 flex items-center gap-4 text-sm font-medium text-slate-400">
            <div className="flex items-center">
              <GoDotFill className="mr-1 text-green-500" />
              <span>{onlineUsers}</span>
              <pre>{onlineUsers}</pre>
              <p>Online</p>
            </div>

            <div className="flex items-center">
              <GoDotFill className="mr-1" />
              <span>{server?.members?.length}</span>
              <p className="">Member</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-6">
            <div
              onClick={() => setInviteModal(true)}
              className="flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-full bg-slate-600 text-2xl text-slate-300"
            >
              <IoPersonAdd />
            </div>

            <div className="flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-full bg-slate-600 text-2xl text-slate-300">
              <IoNotifications />
            </div>

            <div className="flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-full bg-slate-600 text-2xl text-slate-300">
              <IoIosSettings />
            </div>
          </div>

          <ul className="mt-4 flex flex-col rounded-2xl bg-slate-700 p-3 text-sm font-semibold text-slate-100">
            <li
              onClick={() => {
                setCreateChannelModal(true);
              }}
              className="mb-3 cursor-pointer border-b-2 border-b-slate-600 pb-2"
            >
              Create Channel
            </li>
            <li
              onClick={() => setEditModal(true)}
              className="mb-3 cursor-pointer border-b-2 border-b-slate-600 pb-2"
            >
              Edit Server Profile
            </li>
          </ul>

          <button
            onClick={() => setAlertModal(true)}
            className="bg-discord mt-4 w-fit cursor-pointer self-center rounded-lg px-3 py-2 text-xs text-white"
          >
            Delete Server
          </button>
          <LeaveServer
            serverId={server?._id}
            serverName={server?.name}
            serverMembersCount={server?.members?.length}
            mutateServers={serversMutate} // the SWR mutate from parent (servers list)
            setCurrentServer={setCurrentServer}
          />

          <div className="mt-4 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label
                  className="text-sm font-semibold text-slate-300"
                  htmlFor="invite"
                >
                  Invite Code
                </label>
                <MdOutlineRestore
                  onClick={() => {
                    if (server?.inviteCode) {
                      setInviteCode(server?.inviteCode);
                    }
                  }}
                  className="cursor-pointer text-xl text-slate-300"
                />
              </div>
              {server?.owner === userId && (
                <div
                  style={
                    inviteCode === ""
                      ? { pointerEvents: "none", opacity: 0.5 }
                      : {}
                  }
                  onClick={handleSaveInviteCode}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <p className="text-sm font-semibold text-slate-300">Save</p>
                  <IoSave className="text-discord text-xl" />
                </div>
              )}
            </div>

            {server?.owner === userId ? (
              <div className="mt-2 flex items-center rounded-2xl bg-slate-950 text-slate-200">
                <input
                  id="invite"
                  type="text"
                  value={inviteCode}
                  placeholder="Enter invite code. Ex: code-blasters "
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="h-[50px] w-[90%] bg-transparent p-2 pl-3 text-sm outline-none placeholder:font-semibold"
                />
                {inviteCode && (
                  <button className="flex w-[10%] items-center justify-center">
                    <IoCloseCircle
                      onClick={() => setInviteCode("")}
                      className="text-2xl text-slate-300"
                    />
                  </button>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={inviteCode}
                className="pointer-events-none mt-2 h-[50px] rounded-2xl bg-slate-950 p-2 pl-3 text-sm text-slate-200 outline-none placeholder:font-semibold"
              />
            )}

            {server?.owner === userId && (
              <>
                <p className="mt-4 text-center text-sm font-medium text-slate-400">
                  Want to Generate a secure invite code ?
                </p>
                <button
                  onClick={generateUniqueRandomString}
                  className="bg-discord mt-2 w-fit self-center rounded-lg px-4 py-2 text-xs text-white outline-none"
                >
                  Generate
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {inviteModal && (
        <Modal onClose={() => setInviteModal(false)}>
          <h1 className="text-center text-xl font-bold text-white">
            Invite a friend
          </h1>

          <ul className="mt-4 flex items-center justify-center gap-4 border-b-2 border-b-slate-600 pb-3">
            <li className="flex flex-col items-center gap-2">
              <div className="w-fit rounded-full bg-slate-600 p-3 font-bold text-slate-300">
                <RiLink className="text-3xl" />
              </div>
              <p className="text-xs font-semibold text-slate-400">Copy Link</p>
            </li>

            <li className="flex flex-col items-center gap-2">
              <div className="w-fit rounded-full bg-slate-600 p-3 text-3xl font-bold text-slate-300">
                <MdOutlineMailOutline />
              </div>
              <p className="text-xs font-semibold text-slate-400">Email</p>
            </li>
          </ul>

          <div className="mt-2 flex items-center rounded-2xl bg-slate-950 text-slate-200">
            <input
              type="text"
              placeholder="Enter friend name"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="h-[50px] w-[90%] bg-transparent p-2 pl-3 text-sm outline-none placeholder:font-semibold"
            />
            {friendName && (
              <button className="flex w-[10%] items-center justify-center">
                <IoCloseCircle
                  onClick={() => setFriendName("")}
                  className="text-2xl text-slate-300"
                />
              </button>
            )}
          </div>

          <Friends
            close={() => {
              setInviteModal(false);
              setFriendName("");
            }}
            inviterUserId={userId}
            query={friendName}
            serverId={currentServer}
          />
        </Modal>
      )}

      {/* Channel creation  modal*/}
      {createChannelModal && (
        <Modal onClose={() => setCreateChannelModal(false)}>
          <h1 className="text-center text-lg font-semibold text-slate-100">
            Create Channel
          </h1>
          <div className="mt-3 flex flex-col">
            <label className="text-lg font-semibold text-slate-400">
              Channel Name
            </label>
            <input
              onChange={(e) => setServerName(e.target.value)}
              value={serverName}
              type="text"
              placeholder="Enter channel name"
              className="h-[60px] border-b-2 border-b-slate-700 bg-transparent text-sm font-semibold text-slate-200 placeholder-gray-500 outline-none"
            />
          </div>

          <label className="mt-3 text-lg font-semibold text-slate-400">
            Channel Type
          </label>

          <div className="flex items-center p-3 text-slate-400">
            <FaHashtag className="text-3xl" />
            <div className="ml-4 flex flex-grow flex-col text-sm">
              <p className="text-slate-200">Text</p>
              <p>Post images, GIFs, stickers, opinions, and puns</p>
            </div>
            <input
              name="channel"
              defaultChecked
              className="h-[16px] w-[16px]"
              type="radio"
            />
          </div>

          <div className="flex items-center p-3 text-slate-400">
            <HiSpeakerWave className="text-3xl" />
            <div className="ml-4 flex flex-grow flex-col text-sm">
              <p className="text-slate-200">Voice</p>
              <p>Hang out together with voice, video, and screen share</p>
            </div>
            <input name="channel" className="h-[16px] w-[16px]" type="radio" />
          </div>

          <button
            style={
              serverName === "" ? { opacity: 0.5, pointerEvents: "none" } : {}
            }
            onClick={handleCreateChannel}
            type="submit"
            className="bg-discord mt-5 mb-2 flex h-12 w-[200px] items-center justify-center self-center rounded-lg text-sm font-medium text-white transition"
          >
            {loading ? (
              <TailSpin
                visible={true}
                height="30"
                width="30"
                color="white"
                ariaLabel="tail-spin-loading"
                radius="1"
                wrapperStyle={{}}
                wrapperClass=""
              />
            ) : (
              "Create"
            )}
          </button>
        </Modal>
      )}

      {/* Edit modal */}
      {editModal && (
        <Modal onClose={() => setEditModal(false)}>
          <h1 className="text-center text-2xl font-semibold text-white">
            Edit Server
          </h1>

          <div className="mt-4 flex flex-col items-center gap-3">
            {editImagePreview ? (
              <img
                src={editImagePreview}
                alt="preview"
                className="h-[80px] w-[80px] rounded-lg object-cover"
              />
            ) : (
              <div className="h-[80px] w-[80px] rounded-lg bg-slate-700" />
            )}

            <label className="mt-2 w-full">
              <span className="text-sm font-semibold text-slate-300">
                Server Image
              </span>
              <input
                accept="image/*"
                type="file"
                onChange={handleEditImageChange}
                className="mt-2 w-full text-sm text-slate-200"
              />
            </label>

            <div className="mt-3 w-full">
              <label className="text-sm font-semibold text-slate-300">
                Server Name
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                type="text"
                placeholder="Server name"
                className="mt-2 w-full rounded-md bg-slate-950 p-3 text-sm text-slate-200 outline-none"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="bg-discord inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {editLoading ? (
                  <TailSpin height="20" width="20" ariaLabel="loading" />
                ) : (
                  "Save"
                )}
              </button>
              <button
                onClick={() => setEditModal(false)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ServerDetails;
