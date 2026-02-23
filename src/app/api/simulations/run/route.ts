import { NextRequest, NextResponse } from "next/server";
import {
  executeInDocker,
  type ExecutionResult,
} from "@/services/dockerExecutor";

interface RunRequest {
  files: Record<string, string>;
  entryFile: string;
  simulationId?: string;
}

interface RunResponse {
  success: boolean;
  output: string;
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<RunResponse>> {
  try {
    const body: RunRequest = await request.json();
    const { files, entryFile } = body;

    // ── Input validation ────────────────────────────────────────────────
    if (
      !files ||
      typeof files !== "object" ||
      Object.keys(files).length === 0
    ) {
      return NextResponse.json(
        { success: false, output: "", error: "No files provided." },
        { status: 400 },
      );
    }

    if (!entryFile || typeof entryFile !== "string") {
      return NextResponse.json(
        { success: false, output: "", error: "No entry file specified." },
        { status: 400 },
      );
    }

    if (!files[entryFile]) {
      return NextResponse.json(
        {
          success: false,
          output: "",
          error: `Entry file "${entryFile}" not found in provided files.`,
        },
        { status: 400 },
      );
    }

    // Sanitize file names — prevent path traversal
    for (const fileName of Object.keys(files)) {
      if (
        fileName.includes("..") ||
        fileName.startsWith("/") ||
        fileName.startsWith("\\")
      ) {
        return NextResponse.json(
          {
            success: false,
            output: "",
            error: `Invalid file name: "${fileName}"`,
          },
          { status: 400 },
        );
      }
    }

    // ── Execute inside Docker sandbox ───────────────────────────────────
    // Uses child_process.spawn → Docker container
    //   --network none   (no internet)
    //   --memory=256m    (RAM cap)
    //   --cpus=0.5       (CPU cap)
    //   5-second timeout
    const result: ExecutionResult = await executeInDocker({
      files,
      entryFile,
    });

    const response: RunResponse = {
      success: result.success,
      output: result.output,
      ...(result.error ? { error: result.error } : {}),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Simulation execution error:", error);
    return NextResponse.json(
      {
        success: false,
        output: "",
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
