import { NextRequest, NextResponse } from "next/server";
import { proxy } from "../../../proxy";

const COMPLEXITY_API_URL = `${proxy}/api/v1/complexity/analyze`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const token = request.headers.get("authorization") || "";

    const response = await fetch(COMPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Complexity API error:", errorText);
      return NextResponse.json(
        {
          error: "Complexity API returned error",
          message: errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error analyzing complexity:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze complexity",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
