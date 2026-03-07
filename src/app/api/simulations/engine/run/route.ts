import { NextRequest, NextResponse } from "next/server";
import { proxy } from "@/app/proxy";

const BACKEND_URL = proxy;

interface EngineRunRequest {
    simulationId: string;
    editedFiles: Array<{ filename: string; content: string }>;
    entryFile?: string;
}

/**
 * POST /api/simulations/engine/run
 *
 * Proxies the simulation run request to the Prisma backend's
 * simulation engine, which executes code inside an isolated
 * Docker container with curl-based API tests.
 */
export async function POST(request: NextRequest) {
    try {
        const body: EngineRunRequest = await request.json();
        const { simulationId, editedFiles, entryFile } = body;

        if (!simulationId) {
            return NextResponse.json(
                { success: false, error: "simulationId is required" },
                { status: 400 },
            );
        }

        if (!editedFiles || !Array.isArray(editedFiles) || editedFiles.length === 0) {
            return NextResponse.json(
                { success: false, error: "editedFiles array is required" },
                { status: 400 },
            );
        }

        // Forward the Authorization header from the client
        const authHeader = request.headers.get("Authorization") || "";

        const backendRes = await fetch(
            `${BACKEND_URL}/api/v1/simulation-engine/run`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader,
                },
                body: JSON.stringify({ simulationId, editedFiles, ...(entryFile ? { entryFile } : {}) }),
            },
        );

        // Safely parse — the backend might return HTML if it crashed or the
        // route was missing. Always read as text first, then parse.
        const rawText = await backendRes.text();
        let data: Record<string, unknown>;
        try {
            data = JSON.parse(rawText);
        } catch {
            // Backend returned non-JSON (HTML error page / proxy error)
            return NextResponse.json(
                {
                    success: false,
                    error: `Backend returned a non-JSON response (status ${backendRes.status}). Make sure the backend server is running.`,
                },
                { status: 502 },
            );
        }

        if (!backendRes.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: (data.message as string) || "Engine execution failed",
                },
                { status: backendRes.status },
            );
        }

        return NextResponse.json({
            success: true,
            ...(data.data as Record<string, unknown>),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 },
        );
    }
}
