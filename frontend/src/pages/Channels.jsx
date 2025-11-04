// eslint-disable-next-line no-unused-vars
import React, { useState } from "react";

import {
  FaAngleDown,
  FaAngleRight,
  FaHashtag,
} from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

// eslint-disable-next-line react/prop-types
const Channels = ({ data = [] }) => {
  const [showChannels, setShowChannels] = useState(false);
  const [currentChannel, setCurrentChannel] = useState("");
  const navigate = useNavigate();

  return (
    <div className="m-2 flex flex-col p-2">
      <div
        onClick={() => setShowChannels((s) => !s)}
        className="flex cursor-pointer items-center gap-2 text-slate-300"
      >
        {!showChannels ? <FaAngleRight /> : <FaAngleDown />}
        <p className="text-sm font-semibold">Text Channels</p>
      </div>

      {showChannels && (
        <ul className="flex flex-col gap-2 p-3">
          {data.map((c) => {
            const { name, _id } = c;
            return (
              <li
                key={_id}
                onClick={() => {
                  setCurrentChannel(_id);
                  navigate("/channel/" + _id);
                }}
                className={`flex cursor-pointer items-center gap-3 rounded-xl p-2 text-slate-300 hover:bg-slate-700 ${currentChannel === _id ? "bg-slate-800 text-slate-50" : ""}`}
              >
                <FaHashtag className="text-lg" />
                <p className="text-sm font-semibold">{name}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Channels;
