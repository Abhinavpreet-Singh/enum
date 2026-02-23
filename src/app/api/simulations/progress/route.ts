import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy progress requests to the Express backend.
 * The backend handles authentication via JWT and Mongoose operations.
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// GET /api/simulations/progress?simulationId=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const simulationId = searchParams.get("simulationId");
        const all = searchParams.get("all");

        const authHeader = request.headers.get("authorization") || "";

        let url: string;
        if (all === "true") {
            url = `${BACKEND_URL}/api/v1/simulation-progress/all`;
        } else if (simulationId) {
            url = `${BACKEND_URL}/api/v1/simulation-progress/${simulationId}`;
        } else {
            return NextResponse.json(
                { error: "simulationId query param required" },
                { status: 400 },
            );
        }

        const response = await fetch(url, {
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Progress GET proxy error:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch progress",
                message:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}

// POST /api/simulations/progress
// Body: { simulationId, solved?, modifiedFiles? }
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { simulationId, ...rest } = body;

        if (!simulationId) {
            return NextResponse.json(
                { error: "simulationId is required in body" },
                { status: 400 },
            );
        }

        const authHeader = request.headers.get("authorization") || "";

        const response = await fetch(
            `${BACKEND_URL}/api/v1/simulation-progress/${simulationId}`,
            {
                method: "POST",
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(rest),
            },
        );

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Progress POST proxy error:", error);
        return NextResponse.json(
            {
                error: "Failed to update progress",
                message:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
