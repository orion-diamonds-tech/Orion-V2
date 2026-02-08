// src/app/api/revalidate/route.js
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

// Secret token for security (set in .env)
const REVALIDATE_SECRET =
  process.env.REVALIDATE_SECRET || "your-secret-token-here";

/**
 * POST /api/revalidate
 *
 * Clears Next.js cache and forces fresh data fetch
 *
 * Usage from Google Apps Script:
 * UrlFetchApp.fetch('https://your-domain.com/api/revalidate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   payload: JSON.stringify({ secret: 'your-secret-token-here' })
 * });
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { secret, path, tag } = body;

    // Verify secret token
    if (secret !== REVALIDATE_SECRET) {
      console.log("❌ Invalid revalidation secret");
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    console.log("✅ Revalidation request authenticated");

    // Revalidate specific path if provided
    if (path) {
      await revalidatePath(path);
      console.log(`✅ Revalidated path: ${path}`);
    }

    // Revalidate specific tag if provided
    if (tag) {
      await revalidateTag(tag);
      console.log(`✅ Revalidated tag: ${tag}`);
    }

    // If no specific path/tag, revalidate common routes
    if (!path && !tag) {
      await revalidatePath("/");
      await revalidatePath("/collections");
      await revalidateTag("products");
      console.log("✅ Revalidated default paths and tags");
    }

    return NextResponse.json({
      success: true,
      message: "Cache revalidated successfully",
      revalidated: {
        path: path || "default paths",
        tag: tag || "default tags",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to revalidate",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  return NextResponse.json({
    message:
      "Revalidation endpoint is working. Use POST to trigger revalidation.",
    usage:
      "POST with JSON body: { secret: 'your-secret', path: '/optional-path' }",
  });
}
