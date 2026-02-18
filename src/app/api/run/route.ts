import { NextRequest, NextResponse } from "next/server";

const RUN_API_URL = "http://enumcompiler.duckdns.org/run";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("Sending request to:", RUN_API_URL);
    console.log("Body:", JSON.stringify(body));
    
    // Add timeout and DNS family options to help with Windows connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(RUN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", errorText);
      return NextResponse.json(
        { 
          error: "API returned error",
          message: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Response data:", data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error running code:", error);
    return NextResponse.json(
      { 
        error: "Failed to execute code",
        message: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
