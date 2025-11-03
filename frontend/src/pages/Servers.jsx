import React, { useState } from "react";

import Cookies from "js-cookie";
import { HiOutlinePlus } from "react-icons/hi2";
import { LuComputer } from "react-icons/lu";
import { TbMessage } from "react-icons/tb";
import { useNavigate } from "react-router-dom";

import AddServerModal from "../components/AddServerModal";

const Servers = ({ setCurrentServer, data, isLoading, mutate }) => {
  const [addServerModal, setAddServerModal] = useState(false);
  const token = Cookies.get("discordToken");

  const navigate = useNavigate();

  return (
    <div className="w-[100px] px-3 pt-4 text-white">
      <ul className="flex list-none flex-col items-center gap-5">
        <li className="cursor-pointer rounded-full bg-slate-700 p-3">
          <TbMessage className="text-3xl" />
        </li>

        <li
          onClick={() => setAddServerModal(true)}
          className="cursor-pointer rounded-full bg-slate-700 p-3 text-[#57F287] transition hover:rounded-lg hover:bg-[#57F287] hover:text-white"
        >
          <HiOutlinePlus className="text-3xl" />
        </li>

        {!isLoading && (
          <>
            {data?.map((s) => {
              const { image, _id, name } = s;
              return (
                <li
                  className="cursor-pointer"
                  onClick={() => setCurrentServer(_id)}
                  key={_id}
                >
                  {image ? (
                    <img
                      alt={name}
                      src={image}
                      className="h-[60px] w-[60px] rounded-full"
                    />
                  ) : (
                    <div className="bg-discord flex h-[60px] w-[60px] items-center justify-center rounded-full">
                      <LuComputer className="text-2xl" />
                    </div>
                  )}
                </li>
              );
            })}
          </>
        )}
      </ul>

      <AddServerModal
        isOpen={addServerModal}
        onClose={() => setAddServerModal(false)}
        mutate={mutate}
      />
    </div>
  );
};

export default Servers;
