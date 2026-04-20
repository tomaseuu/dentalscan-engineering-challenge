import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * CHALLENGE: NOTIFICATION SYSTEM
 *
 * Your goal is to implement a robust notification logic.
 * 1. When a scan is "completed", create a record in the Notification table.
 * 2. Return a success status to the client.
 * 3. Bonus: Handle potential errors (e.g., database connection issues).
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scanId, status, userId = "demo-clinic" } = body;

    if (!scanId) {
      return NextResponse.json({ error: "Missing scanId" }, { status: 400 });
    }

    // Ignore in progress scans so the clinic is only notified once the scan is done
    if (status !== "completed") {
      return NextResponse.json({
        ok: true,
        message: "No notification needed",
      });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        scanId,
        title: "Scan Completed",
        message: "A new patient scan is ready for review.",
      },
    });
    console.log(`[STUB] Notification triggered for scan ${scanId}`);

    return NextResponse.json({
      ok: true,
      notification,
    });
  } catch (err) {
    console.error("Notification API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
