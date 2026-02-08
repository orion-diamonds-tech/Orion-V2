// src/app/api/pricing-config/route.js
import { NextResponse } from "next/server";
import { PricingConfig } from "../../../models/PricingConfig.js";
import connectDB from "../../../utils/mongodb.js"; // CORRECT: mongodb.js is in utils folder

// Get admin password
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

console.log("🔑 Admin password configured:", ADMIN_PASSWORD);

// Default configuration (used only if no document exists)
const DEFAULT_CONFIG = {
  diamondMargins: {
    lessThan1ct: {
      multiplier: 5,
      flatAddition: 900,
      description: "For diamonds < 1ct: multiply by 5 and add ₹900",
    },
    greaterThan1ct: {
      multiplier: 2.7,
      flatAddition: 0,
      description: "For diamonds ≥ 1ct: multiply by 2.7",
    },
    baseFees: {
      fee1: 150,
      fee2: 700,
      description: "Flat fees added to all diamond prices",
    },
  },
  makingCharges: {
    lessThan2g: {
      ratePerGram: 950,
      description: "For gold weight < 2g",
    },
    greaterThan2g: {
      ratePerGram: 700,
      description: "For gold weight ≥ 2g",
    },
    multiplier: 1.75,
    description: "Final making charge is multiplied by 1.75",
  },
  gstRate: 0.03,
  lastUpdated: new Date().toISOString(),
  updatedBy: "system",
};

// Helper to get or create the singleton config
async function getOrCreateConfig() {
  await connectDB();

  let config = await PricingConfig.findOne();
  if (!config) {
    config = await PricingConfig.create(DEFAULT_CONFIG);
    console.log("✅ Initialized pricing config in MongoDB");
  }
  return config;
}

// GET - Fetch current configuration (public)
export async function GET() {
  try {
    const config = await getOrCreateConfig();
    return NextResponse.json(config.toObject());
  } catch (error) {
    console.error("Error loading config:", error);
    return NextResponse.json(
      { error: "Failed to load configuration" },
      { status: 500 }
    );
  }
}

// POST - Update configuration (protected)
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { password, config: newConfig, updatedBy } = body;

    console.log("=== PRICING-CONFIG POST ===");
    console.log("Password received:", password ? "***" : "EMPTY");
    console.log("Expected password:", ADMIN_PASSWORD);
    console.log("Match:", String(password || "").trim() === ADMIN_PASSWORD);

    // Verify password
    if (!password || String(password).trim() !== ADMIN_PASSWORD) {
      console.log("❌ Password mismatch!");
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    if (!newConfig || !newConfig.diamondMargins || !newConfig.makingCharges) {
      return NextResponse.json(
        { error: "Invalid configuration structure" },
        { status: 400 }
      );
    }

    // Update the singleton document
    const updatedConfig = await PricingConfig.findOneAndUpdate(
      {}, // Find the only document
      {
        ...newConfig,
        lastUpdated: new Date(),
        updatedBy: updatedBy || "admin",
      },
      { new: true, upsert: true } // Create if not exists
    );

    console.log("✅ Config saved to MongoDB");

    return NextResponse.json({
      success: true,
      config: updatedConfig.toObject(),
    });
  } catch (error) {
    console.error("Error saving config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
