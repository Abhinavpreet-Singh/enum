import { NextRequest, NextResponse } from "next/server";
import { proxy } from "../../proxy";

// Reuse the same backend URL that the rest of the app uses (local / remote)
const JUDGE_API_URL = `${proxy}/api/v1/judge/run`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for judge

    const response = await fetch(JUDGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Judge API error:", errorText);
      return NextResponse.json(
        {
          error: "Judge API returned error",
          message: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error running judge:", error);
    return NextResponse.json(
      {
        error: "Failed to execute judge",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
