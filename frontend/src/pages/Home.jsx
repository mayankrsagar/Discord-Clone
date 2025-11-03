/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";

import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { GoHomeFill } from "react-icons/go";
import { HiUser } from "react-icons/hi2";
import { IoClose, IoNotifications } from "react-icons/io5";
import { LuComputer } from "react-icons/lu";
import { MdOutlineDone } from "react-icons/md";
import { TbLogout } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import useSWR from "swr";

import Modal from "../components/Modal";
import host from "../host";
import { axiosInstance as axios } from "../utils/axios";
import Discover from "./Discover";
import ServerDetails from "./ServerDetails";
import Servers from "./Servers";

/**
 * Home — shows servers, server details, and notifications badge + transient banner
 */
const Home = () => {
  const [currentServer, setCurrentServer] = useState("discover");
  const [notificationModal, setNotificationModal] = useState(false);

  const [user, setUser] = useState({});
  const navigate = useNavigate();

  const socket = useRef(null);

  const fetcher = async (url) => {
    try {
      const res = await axios.get(url, {
        withCredentials: true,
      });
      if (res.status === 200) {
        return res.data.servers;
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  const { data, isLoading, mutate } = useSWR(host + "/server", fetcher);

  // invitations SWR + mutate
  const invitationsFetcher = async (url) => {
    try {
      const res = await axios.get(url, {
        withCredentials: true,
      });

      if (res.status === 200) {
        return res.data.invitations;
      }
    } catch (error) {
      // keep same toast behaviour
      const msg = error?.response?.data?.message || error?.message || "Failed";
      toast.error(msg, { duration: 1000 });
    }
  };
  const { data: invites, mutate: invitesMutate } = useSWR(
    host + "/invite",
    invitationsFetcher,
  );

  // local notifications state mirrors invites, but allows socket pushes
  const [localInvites, setLocalInvites] = useState(invites || []);
  const [showBanner, setShowBanner] = useState(null); // holds latest invite to show briefly

  // track invites currently being processed (prevent duplicate clicks)
  const [inFlightIds, setInFlightIds] = useState([]);

  // sync localInvites when invites (SWR) updates
  useEffect(() => {
    setLocalInvites(invites || []);
  }, [invites]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const url = host + "/profile";
        const res = await axios.get(url, {
          withCredentials: true,
        });
        if (res.status === 200) {
          setUser(res.data?.user || {});
        }
      } catch (error) {
        const msg =
          error?.response?.data?.message || error?.message || "Failed";
        toast.error(msg, { duration: 1000 });
      }
    };
    fetchUser();
  }, []);

  // Setup socket to listen for new invites for this user
  useEffect(() => {
    // do not connect until we have a user id
    if (!user?._id) return;

    socket.current = io(host);

    // listen for invites pushed by server. backend should emit 'inviteReceived' with invite object
    socket.current.on("inviteReceived", (invite) => {
      // prepend to local invites
      setLocalInvites((prev) => [invite, ...(prev || [])]);
      // notify user visually
      toast.success(`New invite: ${invite.name}`, { duration: 3000 });
      setShowBanner(invite);
      // brief banner
      setTimeout(() => setShowBanner(null), 3500);
    });

    return () => {
      if (socket.current) {
        socket.current.off("inviteReceived");
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [user?._id]);

  // optimistic accept (immediately updates UI; revalidates caches; reopens server)
  const handleAcceptInvite = async (id, receiverUserId, serverId) => {
    // avoid duplicate clicks
    if (inFlightIds.includes(id)) return;

    const prevInvites = localInvites || [];

    // mark as in-flight
    setInFlightIds((p) => [...p, id]);
    // optimistic UI: remove invite immediately
    setLocalInvites((arr) => (arr || []).filter((it) => it._id !== id));

    try {
      const url = host + "/invite/" + id;
      const res = await axios.put(
        url,
        { receiverUserId, serverId },
        { withCredentials: true },
      );

      if (res.status === 200) {
        toast.success(res.data.message, { duration: 1000 });
        // revalidate invites and servers list to get server membership changes
        await invitesMutate();
        await mutate(); // refresh server list SWR
        // open the server immediately
        setCurrentServer(serverId);
        // close notification modal
        setNotificationModal(false);
      } else {
        // revert optimistic change on unexpected response
        setLocalInvites(prevInvites);
        toast.error("Failed to accept invite");
      }
    } catch (error) {
      // revert optimistic change on error
      setLocalInvites(prevInvites);
      const msg = error?.response?.data?.message || error?.message || "Failed";
      toast.error(msg, { duration: 1000 });
    } finally {
      // remove from in-flight
      setInFlightIds((p) => p.filter((x) => x !== id));
    }
  };

  // optimistic reject (remove immediately, revalidate)
  const handleRejectInvite = async (id) => {
    if (inFlightIds.includes(id)) return;

    const prevInvites = localInvites || [];

    setInFlightIds((p) => [...p, id]);
    setLocalInvites((arr) => (arr || []).filter((it) => it._id !== id));

    try {
      const url = host + "/invite/" + id;
      const res = await axios.delete(url, { withCredentials: true });

      if (res.status === 200) {
        toast.success(res.data.message, { duration: 1000 });
        await invitesMutate();
      } else {
        setLocalInvites(prevInvites);
        toast.error("Failed to remove invite");
      }
    } catch (error) {
      setLocalInvites(prevInvites);
      const msg = error?.response?.data?.message || error?.message || "Failed";
      toast.error(msg, { duration: 1000 });
    } finally {
      setInFlightIds((p) => p.filter((x) => x !== id));
    }
  };

  // badge count
  const pendingCount = (localInvites || []).length;

  return (
    <div className="relative flex min-h-dvh bg-slate-950">
      <Servers
        data={data}
        isLoading={isLoading}
        mutate={mutate}
        setCurrentServer={setCurrentServer}
      />
      {currentServer === "discover" ? (
        <Discover />
      ) : (
        <ServerDetails
          setCurrentServer={setCurrentServer}
          mutate={mutate}
          currentServer={currentServer}
        />
      )}

      {/* Notification banner (top-right) — appears briefly when a new invite is received */}
      {showBanner && (
        <div className="fixed top-4 right-4 z-50 w-[320px] rounded-md bg-slate-800 p-3 text-white shadow-lg">
          <div className="flex items-center gap-3">
            {showBanner.image ? (
              <img
                src={showBanner.image}
                alt={showBanner.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="bg-discord flex h-10 w-10 items-center justify-center rounded-full">
                <LuComputer />
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold">{showBanner.name}</p>
              <p className="text-xs text-slate-300">You have been invited</p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 h-[80px] bg-slate-700 p-3">
        <div className="m-auto flex max-w-[400px] items-center justify-between gap-2 px-3">
          {user?.profileImage ? (
            <img src={user?.profileImage} alt={user?.username} className="" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-discord w-fit rounded-full p-2 text-xl text-white">
                <HiUser />
              </div>
              <p className="font-semibold text-white">{user?.username}</p>
            </div>
          )}

          <div className="flex flex-col items-center">
            <GoHomeFill className="text-2xl text-slate-400" />
            <p className="text-xs font-semibold text-slate-300">Home</p>
          </div>

          <div
            onClick={() => setNotificationModal(true)}
            className="relative flex cursor-pointer flex-col items-center"
          >
            <IoNotifications className="text-2xl text-slate-400" />
            <p className="text-xs font-semibold text-slate-300">
              Notifications
            </p>

            {/* badge */}
            {pendingCount > 0 && (
              <div className="absolute -top-1 right-[-6px] flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                {pendingCount > 99 ? "99+" : pendingCount}
              </div>
            )}
          </div>

          <div
            onClick={() => {
              Cookies.remove("discordToken");
              toast.success("Logout successful", { duration: 1000 });
              setTimeout(() => navigate("/login"), 1000);
            }}
            className="flex flex-col items-center"
          >
            <TbLogout className="text-2xl text-slate-400" />
            <p className="text-xs font-semibold text-slate-300">Logout</p>
          </div>
        </div>
      </div>

      {notificationModal && (
        <Modal onClose={() => setNotificationModal(false)}>
          <h1 className="border-b-2 border-b-slate-600 pb-2 text-center text-2xl font-semibold text-slate-200">
            Invites
          </h1>

          {(localInvites || []).length > 0 ? (
            <ul className="mt-3 flex flex-col gap-5">
              {localInvites.map((i) => {
                const { _id, name, image, receiverUserId, serverId } = i;
                const isInFlight = inFlightIds.includes(_id);

                return (
                  <li
                    className="flex items-center justify-between gap-2"
                    key={_id}
                  >
                    {image ? (
                      <img
                        alt={name}
                        src={image}
                        className="h-[50px] w-[50px] rounded-full"
                      />
                    ) : (
                      <div className="bg-discord flex h-[50px] w-[50px] items-center justify-center rounded-full">
                        <LuComputer className="text-2xl" />
                      </div>
                    )}

                    <p className="flex-grow font-semibold text-slate-100">
                      {name}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleAcceptInvite(_id, receiverUserId, serverId)
                        }
                        disabled={isInFlight}
                        className={`w-fit rounded-full p-1 text-2xl text-white ${
                          isInFlight
                            ? "bg-slate-600 opacity-60"
                            : "bg-green-400"
                        }`}
                      >
                        {isInFlight ? "..." : <MdOutlineDone />}
                      </button>
                      <button
                        onClick={() => handleRejectInvite(_id)}
                        disabled={isInFlight}
                        className={`w-fit rounded-full p-1 text-2xl text-white ${
                          isInFlight ? "bg-slate-600 opacity-60" : "bg-red-500"
                        }`}
                      >
                        <IoClose />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-center text-sm text-slate-300">
              No invites
            </p>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Home;
