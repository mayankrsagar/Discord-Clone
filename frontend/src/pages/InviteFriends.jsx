/* eslint-disable react/prop-types */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { debounce } from "lodash";
import toast from "react-hot-toast";
import { HiUser } from "react-icons/hi2";

import host from "../host";
import { axiosInstance as axios } from "../utils/axios";

const InviteFriends = ({ serverId, query = "", close }) => {
  const [friends, setFriends] = useState([]);

  // Memoized debounced fetch function
  const debouncedFetch = useMemo(() => {
    return debounce(async (searchQuery) => {
      try {
        const url = `${host}/invite/users/${serverId}?name=${encodeURIComponent(searchQuery)}`;
        const res = await axios.get(url);
        setFriends(res.data?.users ?? []);
      } catch (error) {
        const msg =
          error?.response?.data?.message ??
          error?.message ??
          "Failed to fetch users";
        toast.error(msg, { duration: 2000 });
        setFriends([]);
      }
    }, 500);
  }, [serverId]);

  // Callback wrapper to handle empty query safely
  const fetchFriends = useCallback(
    (searchQuery) => {
      if (!searchQuery.trim()) {
        setFriends([]); // Safe here, outside useEffect
        return;
      }
      debouncedFetch(searchQuery);
    },
    [debouncedFetch],
  );

  // Effect to trigger fetch on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFriends(query);
    }, 0);

    return () => {
      clearTimeout(timer);
      debouncedFetch.cancel();
    };
  }, [query, fetchFriends, debouncedFetch]);

  // Invite handler
  const handleInvite = async (receiverUserId) => {
    try {
      const res = await axios.post(`${host}/invite`, {
        receiverUserId,
        serverId,
      });
      toast.success(res.data?.message ?? "Invitation sent", { duration: 1500 });
      if (typeof close === "function") close();
    } catch (error) {
      const msg =
        error?.response?.data?.message ?? error?.message ?? "Invite failed";
      toast.error(msg, { duration: 2000 });
    }
  };

  return (
    <ul className="mt-3 list-none">
      {friends.length === 0 && (
        <li className="text-sm text-slate-400">No users found.</li>
      )}
      {friends.map(({ _id, username, invite }) => (
        <li className="flex items-center gap-3 py-2" key={_id}>
          <div className="bg-discord mt-1 w-fit rounded-full p-3 text-2xl text-white">
            <HiUser />
          </div>
          <p className="mr-auto text-lg text-white">{username}</p>
          {invite && (
            <button
              onClick={() => handleInvite(_id)}
              className="bg-discord cursor-pointer rounded-lg p-2 text-sm font-medium text-white"
            >
              Invite
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

export default InviteFriends;
