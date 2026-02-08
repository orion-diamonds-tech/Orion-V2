// src/app/api/pricing-config/reset/route.js
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "pricing-config.json");

// Get admin password with proper fallback
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

// Default configuration
const DEFAULT_CONFIG = {
  diamondMargins: {
    lessThan1ct: {
      multiplier: 2.2,
      flatAddition: 900,
      description: "For diamonds < 1ct: multiply by 2.2 and add ₹900",
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

// Write config
async function saveConfig(config) {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// POST - Reset configuration to defaults (protected)
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password, updatedBy } = body || {};

    console.log("=== RESET CONFIG ===");
    console.log("Password received:", password ? "***" : "EMPTY");

    // Verify password exists
    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 401 }
      );
    }

    // Verify admin password
    const receivedPassword = String(password).trim();
    if (receivedPassword !== ADMIN_PASSWORD) {
      console.log("❌ Password mismatch!");
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    console.log("✅ Password verified, resetting to defaults");

    // Create reset config with metadata
    const resetConfig = {
      ...DEFAULT_CONFIG,
      lastUpdated: new Date().toISOString(),
      updatedBy: updatedBy || "admin (reset)",
    };

    await saveConfig(resetConfig);
    console.log("✅ Config reset to defaults");

    return NextResponse.json({
      success: true,
      message: "Configuration reset to defaults",
      config: resetConfig,
    });
  } catch (error) {
    console.error("Error resetting config:", error);
    return NextResponse.json(
      { error: "Failed to reset configuration" },
      { status: 500 }
    );
  }
}
