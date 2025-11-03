/* eslint-disable react/prop-types */
import React, { useState } from "react";

import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { IoExit } from "react-icons/io5";

import host from "../host";
import { axiosInstance as axios } from "../utils/axios";
import Modal from "./Modal";

/**
 * LeaveServer (optimistic) — enhanced:
 * - If `serverMembersCount <= 1` it will DELETE the server first (DELETE /server/:id)
 *   then perform optimistic UI update & revalidation.
 *
 * Props:
 * - serverId (string) REQUIRED
 * - serverName (string) optional
 * - serverMembersCount (number) optional — number of members currently in server
 * - mutateServers (function) REQUIRED - your SWR mutate for server list, e.g. mutate from useSWR(host + '/server')
 * - setCurrentServer (function) optional - to set current server (we'll call it with "discover")
 * - apiPath (string) optional - custom leave API path; default: `${host}/server/leave/${serverId}`
 * - deletePath (string) optional - custom delete server path; default: `${host}/server/${serverId}`
 * - method (string) optional - HTTP method for leave: 'post'|'delete'|'put' (default: 'post')
 * - onLeft(response) optional - callback after successful leave/delete
 * - children/className for customization
 */
export default function LeaveServer({
  serverId,
  serverName = "",
  serverMembersCount = null,
  mutateServers,
  setCurrentServer,
  apiPath,
  deletePath,
  method = "post",
  onLeft,
  children,
  className = "",
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!serverId) {
    console.warn("LeaveServer: serverId is required");
  }

  const leaveEndpoint = apiPath || `${host}/server/leave/${serverId}`;
  const deleteEndpoint = deletePath || `${host}/server/${serverId}`;
  const token = Cookies.get("discordToken");

  const callApi = async () => {
    if (!mutateServers) {
      console.warn(
        "LeaveServer: mutateServers is not provided, optimistic update won't work.",
      );
    }

    setLoading(true);

    // Snapshot and optimistic update using SWR mutate (functional form)
    let snapshot;
    try {
      if (typeof mutateServers === "function") {
        // optimistic remove server from list
        snapshot = await mutateServers(
          (current = []) =>
            (current || []).filter((s) => String(s._id) !== String(serverId)),
          { rollbackOnError: true, revalidate: false },
        );
        // NOTE: snapshot holds the previous (returned) value only when mutate returns it;
        // depending on SWR version, mutate may return previous value or new value — we rely on
        // revalidate fallback below to restore if needed.
      }
    } catch (e) {
      // ignore optimistic mutate errors; we'll still call API and revalidate later
    }

    // Immediately show discover view
    try {
      setCurrentServer?.("discover");
    } catch (e) {
      // ignore
    }

    try {
      // If serverMembersCount is known and <= 1, delete the server instead of leaving
      if (typeof serverMembersCount === "number" && serverMembersCount <= 1) {
        // delete server
        const resDelete = await axios.delete(deleteEndpoint, {
          headers: token ? { Authorization: token } : {},
          withCredentials: true,
        });

        if (resDelete?.status === 200) {
          toast.success(resDelete.data?.message || `Server deleted`, {
            duration: 1500,
          });
          // revalidate server list from network
          try {
            if (typeof mutateServers === "function") await mutateServers();
          } catch (e) {}
          onLeft?.(resDelete);
          setModalOpen(false);
          setLoading(false);
          return;
        } else {
          // unexpected response - revalidate (rollback)
          toast.error(resDelete?.data?.message || "Failed to delete server");
          try {
            if (typeof mutateServers === "function") await mutateServers();
          } catch (e) {}
          setLoading(false);
          return;
        }
      }

      // Otherwise, perform leave action (default POST /server/leave/:id or provided apiPath)
      let resLeave;
      if (method.toLowerCase() === "delete") {
        resLeave = await axios.delete(leaveEndpoint, {
          headers: token ? { Authorization: token } : {},
          withCredentials: true,
        });
      } else if (method.toLowerCase() === "put") {
        resLeave = await axios.put(
          leaveEndpoint,
          {},
          {
            headers: token ? { Authorization: token } : {},
            withCredentials: true,
          },
        );
      } else {
        resLeave = await axios.post(
          leaveEndpoint,
          {},
          {
            headers: token ? { Authorization: token } : {},
            withCredentials: true,
          },
        );
      }

      if (resLeave?.status === 200) {
        toast.success(
          resLeave.data?.message || `Left ${serverName || "server"}`,
          { duration: 1500 },
        );
        // revalidate server list
        try {
          if (typeof mutateServers === "function") await mutateServers();
        } catch (e) {}
        onLeft?.(resLeave);
        setModalOpen(false);
      } else {
        toast.error(resLeave?.data?.message || "Failed to leave server");
        try {
          if (typeof mutateServers === "function") await mutateServers();
        } catch (e) {}
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed";
      toast.error(msg);
      // rollback / revalidate so the server reappears
      try {
        if (typeof mutateServers === "function") await mutateServers();
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`flex items-center gap-2 rounded px-3 py-1 text-sm hover:opacity-90 ${className}`}
        type="button"
        aria-label="Leave server"
      >
        {children ?? (
          <>
            <IoExit className="text-lg" />
            <span>Leave</span>
          </>
        )}
      </button>

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>
          <h2 className="text-lg font-semibold text-white">
            {typeof serverMembersCount === "number" && serverMembersCount <= 1
              ? `This server has only you as a member`
              : `Leave ${serverName || "server"}?`}
          </h2>

          <p className="mt-2 text-sm text-slate-300">
            {typeof serverMembersCount === "number" &&
            serverMembersCount <= 1 ? (
              <>
                If you leave, the server will be deleted because you are the
                last member. This action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to leave{" "}
                {serverName ? `"${serverName}"` : "this server"}? You can rejoin
                later if you have an invite.
              </>
            )}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={callApi}
              disabled={loading}
              className="rounded bg-red-500 px-4 py-2 text-white disabled:opacity-60"
            >
              {loading
                ? "Processing..."
                : typeof serverMembersCount === "number" &&
                    serverMembersCount <= 1
                  ? "Delete & Leave"
                  : "Leave Server"}
            </button>

            <button
              onClick={() => setModalOpen(false)}
              className="rounded bg-slate-700 px-4 py-2 text-white"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
