import React from "react";
import { RxCross2 } from "react-icons/rx";

const Modal = ({ children, onClose }) => {
  const handleClose = (e) => {
    if (e.target.id === "modal") onClose();
  };
  return (
    <div
      id="modal"
      onClick={(e) => handleClose(e)}
      className="fixed inset-0 z-10 flex min-w-[300px] items-end justify-center bg-[rgba(0,0,0,0.5)]"
    >
      <div className="relative flex min-h-[80vh] w-full max-w-[600px] flex-col rounded-t-xl bg-slate-800 p-4">
        <div className="absolute right-[10px] top-[10px] cursor-pointer text-xl text-slate-200">
          <RxCross2 onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
