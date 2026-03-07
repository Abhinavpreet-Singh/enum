import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message, name, email } = (await request.json()) as {
      message?: string;
      name?: string;
      email?: string;
    };

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Please provide a message." },
        { status: 400 },
      );
    }

    // NOTE: The backend service at https://enum-backend.onrender.com does not
    // expose a /api/v1/contact endpoint, so we cannot forward messages to it.
    // This endpoint will accept contact messages locally and respond with success.
    // If you want to forward messages to a backend, set NEXT_PUBLIC_CONTACT_ENDPOINT
    // to a valid URL that accepts POST requests with { message, name, email }.
    if (process.env.NEXT_PUBLIC_CONTACT_ENDPOINT) {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_CONTACT_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message, name, email }),
        });

        const data = await response.json();

        if (!response.ok) {
          return NextResponse.json(
            {
              error:
                data?.message ||
                data?.error ||
                "Failed to forward message to backend.",
            },
            { status: response.status },
          );
        }

        return NextResponse.json({ success: true, ...data });
      } catch (forwardError) {
        return NextResponse.json(
          {
            error: "Failed to forward message to backend.",
            message:
              forwardError instanceof Error
                ? forwardError.message
                : "Unknown error",
          },
          { status: 500 },
        );
      }
    }

    // Local fallback: accept messages and return success.
    // (In a real deployment, hook this up to a real backend or email service.)
    console.log("Received contact message", { name, email, message });

    return NextResponse.json({ success: true, message: "Message received." });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
