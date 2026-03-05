import { NextRequest, NextResponse } from "next/server";
import { proxy } from "../../../proxy";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || "";

    const response = await fetch(`${proxy}/api/v1/submissions/recent`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to fetch recent submissions" },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
