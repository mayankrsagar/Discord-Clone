/* eslint-disable react/prop-types */
import { useState } from "react";

import toast from "react-hot-toast";
import { IoExit } from "react-icons/io5";

import host from "../host";
import { axiosInstance as axios } from "../utils/axios";
import Modal from "./Modal";

/**
 * LeaveServer (improved)
 *
 * Props:
 * - serverId (string) REQUIRED
 * - serverName (string) optional
 * - serverMembersCount (number) optional
 * - mutateServers (function) REQUIRED - SWR mutate for server list
 * - setCurrentServer (function) optional - to set current server (we'll call it with "discover")
 * - apiPath (string) optional - custom leave API path
 * - deletePath (string) optional - custom delete server path
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

  const leaveEndpoint = apiPath || `${host}/server/leave/${serverId}`;
  const deleteEndpoint = deletePath || `${host}/server/${serverId}`;

  if (!serverId) {
    console.warn("LeaveServer: serverId is required");
  }
  if (!mutateServers) {
    console.warn(
      "LeaveServer: mutateServers is recommended for optimistic updates",
    );
  }

  const callApi = async () => {
    if (!serverId) return;
    if (loading) return;

    setLoading(true);

    // optimistic update: remove the server locally if mutateServers is provided
    if (typeof mutateServers === "function") {
      try {
        mutateServers(
          (current = []) =>
            (current || []).filter((s) => String(s._id) !== String(serverId)),
          { revalidate: false },
        );
      } catch (e) {
        console.log(e);
        // Non-fatal, we'll revalidate later
        console.warn("optimistic mutate failed", e);
      }
    }

    // switch to discover view immediately (if provided)
    try {
      setCurrentServer?.("discover");
    } catch (e) {
      console.log(e);
      // ignore
    }

    try {
      // If serverMembersCount is known and <= 1, delete the server instead of leaving
      if (typeof serverMembersCount === "number" && serverMembersCount <= 1) {
        const resDelete = await axios.delete(deleteEndpoint, {
          withCredentials: true,
        });

        if (resDelete?.status === 200) {
          toast.success(resDelete.data?.message || `Server deleted`, {
            duration: 1500,
          });
          // revalidate server list from network (restore canonical state)
          if (typeof mutateServers === "function") {
            try {
              await mutateServers();
            } catch (e) {
              console.log(e);
              console.warn("revalidate after delete failed", e);
            }
          }
          onLeft?.(resDelete);
          setModalOpen(false);
          setLoading(false);
          return;
        } else {
          // unexpected response
          toast.error(resDelete?.data?.message || "Failed to delete server");
          if (typeof mutateServers === "function") {
            try {
              await mutateServers();
            } catch (e) {
              console.log(e);
              console.warn(
                "revalidate after unexpected delete response failed",
                e,
              );
            }
          }
          setLoading(false);
          return;
        }
      }

      // Otherwise, perform leave action
      let resLeave;
      const verb = (method || "post").toLowerCase();
      if (verb === "delete") {
        resLeave = await axios.delete(leaveEndpoint, { withCredentials: true });
      } else if (verb === "put") {
        resLeave = await axios.put(
          leaveEndpoint,
          {},
          { withCredentials: true },
        );
      } else {
        // default POST
        resLeave = await axios.post(
          leaveEndpoint,
          {},
          { withCredentials: true },
        );
      }

      if (resLeave?.status === 200) {
        toast.success(
          resLeave.data?.message || `Left ${serverName || "server"}`,
          {
            duration: 1500,
          },
        );
        // revalidate server list
        if (typeof mutateServers === "function") {
          try {
            await mutateServers();
          } catch (e) {
            console.log(e);
            console.warn("revalidate after leave failed", e);
          }
        }
        onLeft?.(resLeave);
        setModalOpen(false);
      } else {
        toast.error(resLeave?.data?.message || "Failed to leave server");
        // revalidate to rollback optimistic change
        if (typeof mutateServers === "function") {
          try {
            await mutateServers();
          } catch (e) {
            console.log(e);
            console.warn("revalidate after failed leave failed", e);
          }
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed";
      toast.error(msg);
      // revalidate so server reappears (rollback optimistic)
      if (typeof mutateServers === "function") {
        try {
          await mutateServers();
        } catch (e) {
          console.log(e);
          console.warn("revalidate after error failed", e);
        }
      }
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
        <Modal onClose={() => !loading && setModalOpen(false)}>
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
              onClick={() => !loading && setModalOpen(false)}
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
