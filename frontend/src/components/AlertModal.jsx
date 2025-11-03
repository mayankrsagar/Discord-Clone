import React from "react";

const AlertModal = ({ handleDeleteServer, setAlertModal }) => {
  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="relative flex h-[120px] w-[80%] max-w-[400px] flex-col justify-center rounded-xl bg-slate-800">
        <p className="text-center text-sm font-semibold text-white">
          Are you sure you want to delete ?
        </p>

        <div className="mt-6 flex items-center gap-4 self-center">
          <button
            onClick={handleDeleteServer}
            className="bg-discord cursor-pointer rounded-lg px-3 py-2 text-sm text-white"
          >
            Delete
          </button>
          <button
            onClick={() => setAlertModal(false)}
            className="cursor-pointer rounded-lg bg-slate-700 px-3 py-2 text-sm text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
