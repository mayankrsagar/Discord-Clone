/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";
import {
  IoCamera,
  IoClose,
  IoPencil,
} from "react-icons/io5";
import useSWR from "swr";

import host from "../host";
import { axiosInstance as axios } from "../utils/axios";
import Loader from "./Loader";
import Modal from "./Modal"; // your Modal component

const fetchProfile = async (url) => {
  // axiosInstance may already set withCredentials, but we assert it here
  const res = await axios.get(url, { withCredentials: true });
  if (res.status === 200) return res.data.user;
  throw new Error("Failed to fetch profile");
};

export default function Profile() {
  const {
    data: user,
    isLoading,
    mutate,
  } = useSWR(host + "/profile", fetchProfile);
  const [open, setOpen] = useState(false);

  // edit states
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setBio(user.bio || "");
      setPreview(user.profileImage || null);
    }
  }, [user]);

  // Revoke the previous preview URL when a new file is selected or component unmounts
  useEffect(() => {
    return () => {
      if (preview && file) {
        try {
          URL.revokeObjectURL(preview);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [preview, file]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    // revoke previous preview URL (if any)
    if (preview && file) {
      try {
        URL.revokeObjectURL(preview);
      } catch (e) {
        // ignore
      }
    }

    const url = URL.createObjectURL(f);
    setFile(f);
    setPreview(url);
  };

  const handleSave = async () => {
    if (!username || username.trim().length === 0) {
      toast.error("Username cannot be empty");
      return;
    }

    setSaving(true);
    try {
      // Use cookie-based auth (httpOnly cookie). No Authorization header.
      const form = new FormData();
      form.append("username", username);
      form.append("bio", bio || "");
      if (file) form.append("image", file);

      const res = await axios.put(`${host}/profile`, form, {
        withCredentials: true, // ensure cookie is sent
        // DO NOT set Content-Type manually
      });

      if (res.status === 200) {
        toast.success(res.data?.message || "Profile updated");

        // Optimistically update SWR cache immediately with returned user
        if (res.data?.user) {
          // mutate(data, false) updates cache and skips revalidation
          await mutate(res.data.user, false);
          // update local preview to server-saved url
          setPreview(res.data.user.profileImage || null);
          setFile(null); // clear selected file because server has new image
        } else {
          // fallback: revalidate if server didn't return user object
          await mutate();
        }

        setEditing(false);
      } else {
        toast.error("Unexpected response from server");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err.message || "Update failed";
      toast.error(msg);
      console.log(err);
      // on failure revalidate so UI stays consistent
      try {
        await mutate();
      } catch (e) {
        // ignore
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    // revoke temporary preview if any
    if (preview && file) {
      try {
        URL.revokeObjectURL(preview);
      } catch (e) {
        // ignore
      }
    }

    // reset to server state
    setUsername(user?.username || "");
    setBio(user?.bio || "");
    setFile(null);
    setPreview(user?.profileImage || null);
    setEditing(false);
  };

  if (isLoading)
    return (
      <div className="px-3 py-2">
        <Loader />
      </div>
    );

  return (
    <>
      {/* Compact profile button — put this in your nav/footer */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-full p-1 transition hover:bg-slate-800"
        aria-label="Open profile"
      >
        {user?.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.username}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="bg-discord flex h-10 w-10 items-center justify-center rounded-full text-white">
            {user?.username?.[0]?.toUpperCase() ?? "U"}
          </div>
        )}
        <span className="hidden text-sm font-semibold text-slate-100 md:inline">
          {user?.username}
        </span>
      </button>

      {/* Modal */}
      {open && (
        <Modal
          onClose={() => {
            setOpen(false);
            setEditing(false);
          }}
        >
          <div className="w-full max-w-[520px]">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-semibold text-white">Profile</h2>
              <button
                onClick={() => {
                  setOpen(false);
                  setEditing(false);
                }}
              >
                <IoClose className="text-xl text-slate-300" />
              </button>
            </div>

            <div className="mt-6 flex gap-6">
              {/* Avatar + change */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {preview ? (
                    <img
                      src={preview}
                      alt="avatar"
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 text-2xl text-white">
                      {user?.username?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}

                  {editing && (
                    <label className="absolute -right-1 -bottom-1 cursor-pointer rounded-full bg-slate-800 p-2 text-white shadow">
                      <IoCamera />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Member since:{" "}
                  <span className="font-medium text-slate-200">
                    {new Date(
                      user?.createdAt || Date.now(),
                    ).toLocaleDateString()}
                  </span>
                </p>
              </div>

              {/* Details */}
              <div className="flex flex-1 flex-col gap-4">
                {/* username */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-300">
                      Username
                    </label>
                    {!editing && (
                      <button
                        onClick={() => setEditing(true)}
                        className="text-slate-400"
                      >
                        <IoPencil />
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-2 w-full rounded-md bg-slate-950 p-3 text-sm text-slate-200 outline-none"
                    />
                  ) : (
                    <p className="mt-2 text-sm font-medium text-slate-100">
                      {user?.username}
                    </p>
                  )}
                </div>

                {/* email */}
                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    Email
                  </label>
                  <p className="mt-2 text-sm text-slate-200">{user?.email}</p>
                </div>

                {/* bio */}
                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    About / Bio
                  </label>
                  {editing ? (
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="mt-2 w-full resize-none rounded-md bg-slate-950 p-3 text-sm text-slate-200 outline-none"
                      rows={4}
                      maxLength={300}
                    />
                  ) : (
                    <p className="mt-2 text-sm whitespace-pre-wrap text-slate-200">
                      {user?.bio || "No bio yet."}
                    </p>
                  )}
                </div>

                {/* actions */}
                <div className="mt-2 flex items-center gap-3">
                  {editing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={
                          saving || !username || username.trim().length === 0
                        }
                        className="bg-discord rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={handleDiscard}
                        className="rounded bg-slate-700 px-4 py-2 text-sm text-white"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="rounded bg-slate-700 px-4 py-2 text-sm text-white"
                    >
                      Edit Profile
                    </button>
                  )}

                  <div className="ml-auto text-xs text-slate-400">
                    <p>Verified: {user?.isVerified ? "Yes" : "No"}</p>
                    <p>
                      Role:{" "}
                      <span className="font-medium text-slate-100">
                        {user?.role || "Member"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
