import { Server } from "socket.io";
import { setIo, competitionRoomId } from "./io.js";

// ─── In-memory state ────────────────────────────────────────────────────────
// rooms: Map<roomId, Map<socketId, { userId, username, color, tabId }>>
const rooms = new Map();

// roomCode: Map<roomId, string>  — latest code snapshot per room
const roomCode = new Map();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a random HSL color for cursor decorations (high saturation, medium lightness) */
function randomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 80%, 55%)`;
}

/** Build a serializable user list for a given room */
function getUserList(roomId) {
    const members = rooms.get(roomId);
    if (!members) return [];
    return Array.from(members.entries()).map(([socketId, user]) => ({
        socketId,
        userId: user.userId,
        username: user.username,
        color: user.color,
        tabId: user.tabId,
    }));
}

/** Remove a socket from a room and broadcast the updated user list */
function leaveRoom(socket, roomId) {
    const members = rooms.get(roomId);
    if (!members) return;

    members.delete(socket.id);

    // If room is now empty, clean up entirely
    if (members.size === 0) {
        rooms.delete(roomId);
        roomCode.delete(roomId);
    } else {
        // Broadcast updated user list to remaining members
        socket.to(roomId).emit("room:users", getUserList(roomId));
    }

    socket.leave(roomId);
}

// ─── Main setup ─────────────────────────────────────────────────────────────

/**
 * Attach Socket.IO to an existing HTTP server.
 *
 * @param {import("http").Server} httpServer
 * @param {string[]} allowedOrigins — CORS origins (reuse from Express config)
 * @returns {Server} the Socket.IO server instance
 */
export function setupSocket(httpServer, allowedOrigins = []) {
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        },
        // Ping every 25s, timeout after 20s of no pong → faster disconnect detection
        pingInterval: 25000,
        pingTimeout: 20000,
    });

    io.on("connection", (socket) => {
        console.log(`[socket] connected: ${socket.id}`);

        // Track which rooms this socket has joined (for disconnect cleanup)
        const joinedRooms = new Set();

        // ── room:join ─────────────────────────────────────────────────────
        socket.on("room:join", ({ roomId, userId, username, tabId }) => {
            if (!roomId || !username) return;

            // Initialize room map if first member
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Map());
            }

            const color = randomColor();
            rooms.get(roomId).set(socket.id, { userId, username, color, tabId });
            joinedRooms.add(roomId);

            // Socket.IO room join
            socket.join(roomId);
            console.log(`[socket] ${username} (${socket.id}) joined room ${roomId}`);

            // Send current code snapshot to the joining user (if any)
            if (roomCode.has(roomId)) {
                socket.emit("code:sync", { code: roomCode.get(roomId) });
            }

            // Broadcast updated user list to everyone in the room (including sender)
            io.in(roomId).emit("room:users", getUserList(roomId));
        });

        // ── room:leave ────────────────────────────────────────────────────
        socket.on("room:leave", ({ roomId }) => {
            if (!roomId) return;
            console.log(`[socket] ${socket.id} left room ${roomId}`);
            leaveRoom(socket, roomId);
            joinedRooms.delete(roomId);
        });

        // ── code:update ───────────────────────────────────────────────────
        // Broadcast code changes to every other client in the room.
        socket.on("code:update", ({ roomId, code }) => {
            if (!roomId) return;

            // Persist latest code in memory
            roomCode.set(roomId, code);

            // Send to all *others* in the room (not back to sender)
            socket.to(roomId).emit("code:update", { code, senderId: socket.id });
        });

        // ── cursor:update ─────────────────────────────────────────────────
        // Relay cursor position to other users for live cursor rendering.
        socket.on("cursor:update", ({ roomId, cursor }) => {
            if (!roomId) return;

            const members = rooms.get(roomId);
            const user = members?.get(socket.id);
            if (!user) return;

            socket.to(roomId).emit("cursor:update", {
                socketId: socket.id,
                username: user.username,
                color: user.color,
                cursor, // { lineNumber, column }
            });
        });

        // ── typing:start / typing:stop ────────────────────────────────────
        socket.on("typing:start", ({ roomId }) => {
            if (!roomId) return;
            const members = rooms.get(roomId);
            const user = members?.get(socket.id);
            if (!user) return;

            socket.to(roomId).emit("typing:start", {
                socketId: socket.id,
                username: user.username,
            });
        });

        socket.on("typing:stop", ({ roomId }) => {
            if (!roomId) return;
            socket.to(roomId).emit("typing:stop", { socketId: socket.id });
        });

        // ── competition:join ────────────────────────────────────────────
        // Join a question-competition room for live winner/participant updates.
        socket.on("competition:join", ({ competitionId }) => {
            if (!competitionId) return;
            socket.join(competitionRoomId(competitionId));
        });

        socket.on("competition:leave", ({ competitionId }) => {
            if (!competitionId) return;
            socket.leave(competitionRoomId(competitionId));
        });

        // ── disconnect ────────────────────────────────────────────────────
        // Clean up all rooms this socket was in.
        socket.on("disconnect", (reason) => {
            console.log(`[socket] disconnected: ${socket.id} (${reason})`);
            for (const roomId of joinedRooms) {
                leaveRoom(socket, roomId);
            }
            joinedRooms.clear();
        });
    });

    console.log("[socket] Socket.IO server attached");
    setIo(io);
    return io;
}
