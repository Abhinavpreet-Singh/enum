/** @type {import("socket.io").Server | null} */
let ioInstance = null;

export function setIo(io) {
  ioInstance = io;
}

export function getIo() {
  return ioInstance;
}

export function competitionRoomId(competitionId) {
  return `competition:${competitionId}`;
}

export function emitCompetitionState(competitionId, state) {
  if (!ioInstance) return;
  ioInstance
    .to(competitionRoomId(competitionId))
    .emit("competition:state", state);
}
