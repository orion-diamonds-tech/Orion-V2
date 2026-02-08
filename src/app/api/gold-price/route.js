// src/app/api/gold-price/route.js
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// In-memory cache
let priceCache = {
  price24k: null,
  lastFetchDate: null,
  fetchTime: "08:00", // 8:00 AM IST
};

// Helper: Check if we should fetch new price
function shouldFetchPrice() {
  const now = new Date();
  const istTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const currentDate = istTime.toISOString().split("T")[0];
  const currentHour = istTime.getHours();

  // If never fetched, fetch now
  if (!priceCache.lastFetchDate) {
    return true;
  }

  // If it's a new day and past 8 AM, fetch
  if (currentDate > priceCache.lastFetchDate && currentHour >= 8) {
    return true;
  }

  return false;
}

// Fetch 24K gold price from Groww Surat page
async function fetch24kPriceFromGroww() {
  const url = "https://groww.in/gold-rates/gold-rate-today-in-surat";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract all text containing ₹ and numbers
    const bodyText = $("body").text();
    const matches = bodyText.match(/₹\s?([\d,]+\.?\d*)/g);

    if (matches) {
      for (const match of matches) {
        const priceStr = match.replace(/₹\s?|,/g, "");
        const price = parseFloat(priceStr);

        // Validate realistic per gram gold price
        if (price > 5000 && price < 20000) {
          return price;
        }
      }
    }

    // Fallback: try to find elements with specific classes
    const spans = $("span.bodyLargeHeavy");
    for (let i = 0; i < spans.length; i++) {
      const text = $(spans[i]).text();
      if (text.includes("₹") || /\d/.test(text)) {
        const priceMatch = text.match(/₹?\s?([\d,]+\.?\d*)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(/,/g, ""));
          if (price > 5000 && price < 20000) {
            return price;
          }
        }
      }
    }

    throw new Error("Could not locate valid 24K price on Groww Surat page");
  } catch (error) {
    console.error("Error fetching gold price:", error);
    throw error;
  }
}

// Update cache with new price
async function updatePriceCache() {
  try {
    console.log("Fetching fresh gold price from Groww...");
    const price = await fetch24kPriceFromGroww();

    const now = new Date();
    const istTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    priceCache = {
      price24k: price,
      lastFetchDate: istTime.toISOString().split("T")[0],
      fetchTime: "08:00",
    };

    console.log(`✅ Price updated: ₹${price.toFixed(2)}/gram`);
    return price;
  } catch (error) {
    console.error("Failed to update price cache:", error);
    throw error;
  }
}

// GET endpoint
export async function GET() {
  try {
    // Check if we need to fetch new price
    if (shouldFetchPrice()) {
      await updatePriceCache();
    }

    // If still no price (e.g., first fetch failed), try again
    if (!priceCache.price24k) {
      await updatePriceCache();
    }

    const istTime = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    return NextResponse.json({
      success: true,
      city: "Surat",
      price: Math.round(priceCache.price24k * 100) / 100,
      unit: "INR per gram",
      date: priceCache.lastFetchDate,
      lastUpdated: istTime.toISOString(),
      nextUpdate: "Tomorrow at 8:00 AM IST",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch gold price",
      },
      { status: 500 }
    );
  }
}

// Force refresh endpoint (for manual updates)
export async function POST() {
  try {
    await updatePriceCache();

    return NextResponse.json({
      success: true,
      message: "Price cache updated successfully",
      price: priceCache.price24k,
      date: priceCache.lastFetchDate,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update price cache",
      },
      { status: 500 }
    );
  }
}
