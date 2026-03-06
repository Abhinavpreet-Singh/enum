import { NextRequest, NextResponse } from "next/server";
import { proxy } from "@/app/proxy";

const BACKEND_URL = proxy;

interface EngineRunRequest {
    simulationId: string;
    editedFiles: Array<{ filename: string; content: string }>;
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
        const { simulationId, editedFiles } = body;

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
                body: JSON.stringify({ simulationId, editedFiles }),
            },
        );

        const data = await backendRes.json();

        if (!backendRes.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: data.message || "Engine execution failed",
                },
                { status: backendRes.status },
            );
        }

        return NextResponse.json({
            success: true,
            ...data.data,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 },
        );
    }
}
