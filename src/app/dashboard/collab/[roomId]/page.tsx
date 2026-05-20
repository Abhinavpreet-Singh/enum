import CollabRoomClient from "./collab-room-client";

export function generateStaticParams() {
  return [{ roomId: "default" }];
}

export default function CollabRoomPage() {
  return <CollabRoomClient />;
}
