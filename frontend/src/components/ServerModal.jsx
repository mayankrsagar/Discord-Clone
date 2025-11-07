import PropTypes from "prop-types";
import { GoDotFill } from "react-icons/go";
import { IoIosSettings } from "react-icons/io";
import { IoCloseCircle, IoNotifications, IoPersonAdd } from "react-icons/io5";
import { LuComputer } from "react-icons/lu";
import { MdOutlineRestore } from "react-icons/md";

import Modal from "./Modal";

export default function ServerModal({
  server,
  userId,
  onlineUsers,
  inviteCode,
  setInviteCode,
  onClose,
  onOpenInvite,
  onOpenCreateChannel,
  onOpenEdit,
  onDelete,
  onSaveInviteCode,
  onGenerateInvite,
}) {
  return (
    <Modal onClose={onClose}>
      {server?.image ? (
        <img
          className="mb-2 h-[60px] w-[60px] rounded-xl"
          src={server.image}
          alt={server.name}
        />
      ) : (
        <div className="bg-discord mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-full">
          <LuComputer />
        </div>
      )}
      <h1 className="mt-4 text-2xl font-semibold">{server?.name}</h1>

      <div className="mt-3 flex items-center gap-4 text-sm text-slate-400">
        <div className="flex items-center">
          <GoDotFill className="mr-1 text-green-500" />
          <span>{onlineUsers}</span>
          <p>Online</p>
        </div>
        <div className="flex items-center">
          <GoDotFill className="mr-1" />
          <span>{server?.members?.length}</span>
          <p>Member</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-6">
        <button
          onClick={onOpenInvite}
          className="h-12 w-12 rounded-full bg-slate-600"
        >
          {" "}
          <IoPersonAdd />{" "}
        </button>
        <button className="h-12 w-12 rounded-full bg-slate-600">
          {" "}
          <IoNotifications />{" "}
        </button>
        <button
          onClick={onOpenEdit}
          className="h-12 w-12 rounded-full bg-slate-600"
        >
          {" "}
          <IoIosSettings />{" "}
        </button>
      </div>

      <ul className="mt-4 rounded-2xl bg-slate-700 p-3">
        <li
          onClick={onOpenCreateChannel}
          className="cursor-pointer border-b border-slate-600 py-2"
        >
          Create Channel
        </li>
        <li
          onClick={onOpenEdit}
          className="cursor-pointer border-b border-slate-600 py-2"
        >
          Edit Server Profile
        </li>
      </ul>

      <button
        onClick={onDelete}
        className="bg-discord mt-4 rounded-lg px-3 py-2 text-xs"
      >
        Delete Server
      </button>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm">Invite Code</label>
          <MdOutlineRestore
            onClick={() => setInviteCode(server?.inviteCode ?? "")}
            className="cursor-pointer"
          />
        </div>

        {server?.owner === userId ? (
          <div className="mt-2 flex items-center rounded-2xl bg-slate-950 p-2">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="flex-1 bg-transparent outline-none"
            />
            {inviteCode && <IoCloseCircle onClick={() => setInviteCode("")} />}
          </div>
        ) : (
          <input
            readOnly
            value={inviteCode}
            className="mt-2 w-full rounded-2xl bg-slate-950 p-2"
          />
        )}

        {server?.owner === userId && (
          <div className="mt-3 flex justify-center gap-2">
            <button
              onClick={onSaveInviteCode}
              className="bg-discord rounded px-3 py-1"
            >
              Save
            </button>
            <button
              onClick={onGenerateInvite}
              className="rounded bg-slate-700 px-3 py-1"
            >
              Generate
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

ServerModal.propTypes = {
  server: PropTypes.object,
  userId: PropTypes.string,
  onlineUsers: PropTypes.number,
  inviteCode: PropTypes.string,
  setInviteCode: PropTypes.func.isRequired,
  onClose: PropTypes.func,
  onOpenInvite: PropTypes.func,
  onOpenCreateChannel: PropTypes.func,
  onOpenEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSaveInviteCode: PropTypes.func,
  onGenerateInvite: PropTypes.func,
};
