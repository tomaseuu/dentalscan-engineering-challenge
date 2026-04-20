import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * CHALLENGE: MESSAGING SYSTEM
 *
 * Your goal is to build a basic communication channel between the Patient and Dentist.
 * 1. Implement the POST handler to save a new message into a Thread.
 * 2. Implement the GET handler to retrieve message history for a given thread.
 * 3. Focus on data integrity and proper relations.
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId") || "demo-patient";

    // Use patientId so the frontend can stay simple and not manage thread IDs
    const thread = await prisma.thread.findFirst({
      where: {
        patientId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      threadId: thread?.id ?? null,
      messages: thread?.messages ?? [],
    });
  } catch (err) {
    console.error("Messaging GET API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId = "demo-patient", content, sender = "patient" } = body;

    // Do not save empty messages
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Missing message content" },
        { status: 400 },
      );
    }

    let thread = await prisma.thread.findFirst({
      where: {
        patientId,
      },
    });

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          patientId,
        },
      });
    }

    // Reuse the thread, then attach the new patient message to it
    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        content: content.trim(),
        sender,
      },
    });

    return NextResponse.json({
      ok: true,
      threadId: thread.id,
      message,
    });
  } catch (err) {
    console.error("Messaging API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
