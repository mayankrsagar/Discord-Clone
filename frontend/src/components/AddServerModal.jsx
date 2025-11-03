import { useState } from "react";

import toast from "react-hot-toast";
import { FaArrowLeft } from "react-icons/fa6";
import { IoAddOutline, IoClose, IoCloseCircle } from "react-icons/io5";
import { MdCameraAlt } from "react-icons/md";
import { PiWarningCircleFill } from "react-icons/pi";
import useSWRMutation from "swr/mutation";

import { axiosInstance as axios } from "../utils/axios";
import Modal from "./Modal";

/* ---------- util ---------- */
const createServer = async (_, { arg }) => {
  const formData = new FormData();
  formData.append("name", arg.name);
  if (arg.image) formData.append("image", arg.image);
  return axios.post("/server", formData).then((r) => r.data);
};

/* ---------- component ---------- */
const AddServerModal = ({ isOpen, onClose, mutate }) => {
  /* ----- local state ----- */
  const [file, setFile] = useState(null); // File object
  const [imageUrl, setImageUrl] = useState(""); // data-url preview
  const [serverName, setServerName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [joinModal, setJoinModal] = useState(false);
  const [fileKey, setFileKey] = useState(0); // forces new <input />

  /* ----- create server ----- */
  const { trigger, isMutating } = useSWRMutation("/server", createServer, {
    onSuccess: (res) => {
      toast.success(res.message);
      mutate(); // refresh list
      onClose(); // close modal
      resetForm(); // clean local state
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Server error"),
  });

  /* ---------- helpers ---------- */
  const resetForm = () => {
    setFile(null);
    setImageUrl("");
    setServerName("");
    setFileKey((k) => k + 1);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (!f) return setImageUrl("");
    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result);
    reader.readAsDataURL(f);
  };

  const clearImage = () => {
    setFile(null);
    setImageUrl("");
    setFileKey((k) => k + 1); // new input node ⇒ empty
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serverName.trim()) return toast.error("Name required");
    trigger({ name: serverName.trim(), image: file });
  };

  const handleJoinServer = () => {
    if (!inviteLink.trim()) return setErrorMsg("Enter an invite link");
    toast.success("Join flow coming soon!");
  };

  /* ---------- render ---------- */
  if (!isOpen) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <form
        onSubmit={handleSubmit}
        className="mx-4 h-fit w-full max-w-md rounded-lg bg-gray-800 shadow-lg sm:mx-auto"
      >
        {/* header */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="m-2 text-gray-500 hover:text-[#57F287]"
          >
            <IoClose fontSize={30} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 p-4">
          <h1 className="text-xl font-semibold text-white">
            Create Your Server
          </h1>
          <p className="max-w-[400px] text-center text-sm text-gray-300">
            Your server is where you and your friends hang out. Make yours and
            start talking.
          </p>

          {/* image */}
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt="server"
                className="h-[80px] w-[80px] rounded-full object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="bg-discord absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full text-white"
              >
                <IoClose />
              </button>
            </div>
          ) : (
            <label
              htmlFor="file"
              className="relative mt-10 flex cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-slate-100 p-5"
            >
              <MdCameraAlt fontSize={30} />
              <span className="text-sm text-slate-300 uppercase">Upload</span>
              <div className="bg-discord absolute top-1 right-1 rounded-full p-1">
                <IoAddOutline className="text-white" />
              </div>
            </label>
          )}

          {/* controlled file input */}
          <input
            id="file"
            key={fileKey}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* name */}
          <div className="mt-4 w-full">
            <label className="font-semibold text-slate-300">Server name</label>
            <div className="mt-2 flex items-center rounded-2xl bg-slate-950">
              <input
                type="text"
                placeholder="Enter server name"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className="h-[50px] w-[90%] bg-transparent p-2 pl-3 text-sm outline-none"
              />
              {serverName && (
                <button
                  type="button"
                  onClick={() => setServerName("")}
                  className="flex w-[10%] items-center justify-center"
                >
                  <IoCloseCircle className="text-2xl text-slate-300" />
                </button>
              )}
            </div>
          </div>

          {/* buttons */}
          <button
            type="submit"
            disabled={isMutating || !serverName.trim()}
            className="bg-discord mt-4 h-[50px] w-full rounded-3xl text-sm font-semibold disabled:opacity-50"
          >
            {isMutating ? "Creating..." : "Create Server"}
          </button>

          <p className="my-3 text-center text-lg font-semibold">
            Have an invite already?
          </p>
          <button
            type="button"
            onClick={() => setJoinModal(true)}
            className="bg-discord flex h-[50px] w-full items-center justify-center rounded-3xl text-sm font-semibold"
          >
            Join a Server
          </button>
        </div>
      </form>

      {/* Join-server modal */}
      {joinModal && (
        <Modal>
          <button
            onClick={() => {
              setJoinModal(false);
              onClose();
            }}
            className="mb-2 text-xl"
          >
            <FaArrowLeft />
          </button>

          <h1 className="text-center text-xl font-bold">
            Join an existing server
          </h1>
          <p className="mt-2 text-center text-sm font-semibold text-slate-400">
            Enter an invite below to join an existing server
          </p>

          <div className="mt-4 flex flex-col">
            <label className="text-sm font-semibold text-slate-300">
              Invite Link
            </label>
            <div className="mt-2 flex items-center rounded-2xl bg-slate-950">
              <input
                type="text"
                placeholder="https://discord.gg/htkzmak "
                value={inviteLink}
                onChange={(e) => {
                  setInviteLink(e.target.value);
                  setErrorMsg("");
                }}
                className="h-[50px] w-full bg-transparent p-2 pl-3 text-sm outline-none"
              />
            </div>
            {errorMsg && (
              <div className="mt-2 flex items-center gap-1 text-red-500">
                <PiWarningCircleFill />
                <p className="text-xs font-semibold">{errorMsg}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleJoinServer}
            className="bg-discord mt-4 h-[50px] w-full rounded-3xl text-sm font-semibold"
          >
            Join with Invite Link
          </button>
        </Modal>
      )}
    </div>
  );
};

export default AddServerModal;
