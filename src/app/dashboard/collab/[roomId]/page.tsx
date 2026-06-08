import CollabRoomContent from "./CollabRoomContent";

// For `output: "export"`, generateStaticParams must return at least one entry.
// The actual roomId is read client-side via useParams() at runtime.
export function generateStaticParams() {
  return [{ roomId: "_" }];
}

export default function CollabRoomPage() {
  return <CollabRoomContent />;
}
