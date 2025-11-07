import PropTypes from "prop-types";

import Friends from "../views/InviteFriends";
import Modal from "./Modal";

export default function InviteModal({ onClose, serverId, inviterUserId }) {
  return (
    <Modal onClose={onClose}>
      <h1 className="text-center text-xl font-bold">Invite a friend</h1>
      <div className="mt-4">
        <Friends
          close={onClose}
          inviterUserId={inviterUserId}
          query=""
          serverId={serverId}
        />
      </div>
    </Modal>
  );
}

InviteModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  serverId: PropTypes.string.isRequired,
  inviterUserId: PropTypes.string.isRequired,
};
