#!/usr/bin/env node
// ========================================
// FINAL WORKING CALCULATOR SCRIPT
// Run: node scripts/calculate-prices.js
// ========================================

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const STOREFRONT_ACCESS_TOKEN =
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const PRICING_API_URL =
  process.env.NEXT_PUBLIC_PRICING_API_URL || "http://localhost:3001";

if (!SHOPIFY_STORE_DOMAIN || !STOREFRONT_ACCESS_TOKEN) {
  console.error("❌ Missing environment variables!");
  process.exit(1);
}

// ========================================
// IMPROVED HTML PARSER
// ========================================
function parseDescription(descriptionHtml) {
  const specMap = {};

  if (!descriptionHtml) return specMap;

  // Remove extra whitespace and normalize
  const normalized = descriptionHtml.replace(/\s+/g, " ");

  // Pattern 1: <li><strong>Key:</strong> Value</li>
  const liPattern = /<li[^>]*>\s*<strong>([^:]+):<\/strong>\s*([^<]+)<\/li>/gi;
  let match;

  while ((match = liPattern.exec(normalized)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key && value) {
      specMap[key] = value;
    }
  }

  // Pattern 2: <p><strong>Key:</strong> Value</p>
  const pPattern = /<p[^>]*>\s*<strong>([^:]+):<\/strong>\s*([^<]+)<\/p>/gi;
  while ((match = pPattern.exec(normalized)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key && value && !specMap[key]) {
      specMap[key] = value;
    }
  }

  // Pattern 3: Handle multi-line <li> tags
  const multiLineLiPattern =
    /<li[^>]*>\s*<strong>([^:]+):<\/strong>\s*([^<]*?)<\/li>/gi;
  while ((match = multiLineLiPattern.exec(descriptionHtml)) !== null) {
    const key = match[1].trim();
    const value = match[2].replace(/\s+/g, " ").trim();
    if (key && value && !specMap[key]) {
      specMap[key] = value;
    }
  }

  return specMap;
}

// ========================================
// SHOPIFY REQUEST
// ========================================
async function shopifyRequest(query, variables = {}) {
  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json;
}

// ========================================
// QUERIES
// ========================================
const GET_ALL_COLLECTIONS = `
  query GetAllCollections {
    collections(first: 10) {
      edges {
        node {
          handle
          title
        }
      }
    }
  }
`;

const GET_COLLECTION_PRODUCTS = `
  query GetCollectionProducts($handle: String!) {
    collection(handle: $handle) {
      title
      products(first: 50) {
        edges {
          node {
            id
            handle
            title
            description
            descriptionHtml
          }
        }
      }
    }
  }
`;

// ========================================
// PRICING FUNCTIONS
// ========================================
async function getPricingConfig() {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/pricing-config`);
    return await response.json();
  } catch (error) {
    console.warn("⚠️  Using default pricing config");
    return {
      diamondMargins: {
        lessThan1ct: { multiplier: 2.2, flatAddition: 900 },
        greaterThan1ct: { multiplier: 2.7, flatAddition: 0 },
        baseFees: { fee1: 150, fee2: 700 },
      },
      makingCharges: {
        lessThan2g: { ratePerGram: 950 },
        greaterThan2g: { ratePerGram: 700 },
        multiplier: 1.75,
      },
      gstRate: 0.03,
    };
  }
}

async function getGoldPrice() {
  try {
    const response = await fetch(
      "https://gold-price-india.onrender.com/api/gold/24k"
    );
    const json = await response.json();
    return parseFloat(json.price) || 7000;
  } catch (error) {
    console.warn("⚠️  Using fallback gold price: ₹7000/g");
    return 7000;
  }
}

function findRate(weight, ranges) {
  for (const [min, max, rate] of ranges) {
    if (weight >= min && weight <= max) return rate;
  }
  return 0;
}

function calculatePrice(diamonds, goldWeight, goldKarat, config, gold24Price) {
  let totalDiamondPrice = 0;

  for (const d of diamonds) {
    const shape = (d.shape || "").toLowerCase();
    const weight = parseFloat(d.weight) || 0;
    const count = parseInt(d.count) || 0;

    if (weight <= 0 || count <= 0) continue;

    const roundShapes = ["round", "rnd", "r"];
    let rate = 0;

    if (roundShapes.includes(shape)) {
      if (weight < 1) {
        rate = findRate(weight, [
          [0.001, 0.005, 13500],
          [0.006, 0.009, 11600],
          [0.01, 0.02, 6900],
          [0.025, 0.035, 4600],
          [0.04, 0.07, 4600],
          [0.08, 0.09, 4600],
          [0.1, 0.12, 5100],
          [0.13, 0.17, 5100],
          [0.18, 0.22, 6200],
          [0.23, 0.29, 7000],
          [0.3, 0.39, 6750],
          [0.4, 0.49, 6750],
          [0.5, 0.69, 7100],
          [0.7, 0.89, 7100],
          [0.9, 0.99, 7300],
        ]);
      } else {
        rate = findRate(weight, [
          [1.0, 1.99, 11000],
          [2.0, 2.99, 12500],
          [3.0, 3.99, 13750],
          [4.0, 4.99, 14550],
          [5.0, 5.99, 15500],
        ]);
      }
    } else {
      if (weight < 1) {
        rate = findRate(weight, [[0.001, 0.99, 7800]]);
      } else {
        rate = findRate(weight, [
          [1.0, 1.99, 11500],
          [2.0, 2.99, 13500],
          [3.0, 3.99, 14550],
          [4.0, 4.99, 15550],
          [5.0, 5.99, 16500],
        ]);
      }
    }

    const base = weight * count * rate;
    let adjusted = base;

    if (weight >= 1) {
      adjusted =
        base * config.diamondMargins.greaterThan1ct.multiplier +
        config.diamondMargins.greaterThan1ct.flatAddition;
    } else {
      adjusted =
        base * config.diamondMargins.lessThan1ct.multiplier +
        config.diamondMargins.lessThan1ct.flatAddition;
    }

    totalDiamondPrice += adjusted;
  }

  totalDiamondPrice +=
    config.diamondMargins.baseFees.fee1 + config.diamondMargins.baseFees.fee2;

  const goldRates = {
    "10K": gold24Price * (10 / 24),
    "14K": gold24Price * (14 / 24),
    "18K": gold24Price * (18 / 24),
  };
  const goldPrice = (goldRates[goldKarat] || 0) * goldWeight;

  let makingCharge =
    goldWeight >= 2
      ? goldWeight * config.makingCharges.greaterThan2g.ratePerGram
      : goldWeight * config.makingCharges.lessThan2g.ratePerGram;
  makingCharge *= config.makingCharges.multiplier;

  const subtotal = Math.round(totalDiamondPrice + goldPrice + makingCharge);
  const gst = Math.round(subtotal * config.gstRate);
  const total = Math.round(subtotal + gst);

  return {
    diamondPrice: Math.round(totalDiamondPrice),
    goldPrice: Math.round(goldPrice),
    makingCharge: Math.round(makingCharge),
    gst: Math.round(gst),
    total: Math.round(total),
  };
}

// ========================================
// PROCESS PRODUCT
// ========================================
function processProduct(product, config, gold24Price) {
  const specMap = parseDescription(
    product.descriptionHtml || product.description || ""
  );

  // Debug: Log extracted fields for first product
  if (!processProduct.debugged) {
    console.log("\n🔍 Debug first product:");
    console.log("   Keys found:", Object.keys(specMap).join(", "));
    processProduct.debugged = true;
  }

  const shapes = (specMap["Diamond Shape"] || "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v);

  const weights = (specMap["Diamond Weight"] || "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v);

  const counts = (specMap["Total Diamonds"] || "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v);

  const diamonds = shapes.map((shape, i) => ({
    shape,
    weight: parseFloat(weights[i]) || 0,
    count: parseInt(counts[i]) || 0,
  }));

  const goldWeights = {
    "10K":
      parseFloat((specMap["10K Gold"] || "0").replace(/g|gm/gi, "").trim()) ||
      0,
    "14K":
      parseFloat((specMap["14K Gold"] || "0").replace(/g|gm/gi, "").trim()) ||
      0,
    "18K":
      parseFloat((specMap["18K Gold"] || "0").replace(/g|gm/gi, "").trim()) ||
      0,
  };

  const prices = {};
  for (const karat of ["10K", "14K", "18K"]) {
    if (goldWeights[karat] > 0) {
      try {
        prices[karat] = calculatePrice(
          diamonds,
          goldWeights[karat],
          karat,
          config,
          gold24Price
        );
      } catch (error) {
        prices[karat] = null;
      }
    }
  }

  return {
    handle: product.handle,
    title: product.title,
    goldWeights,
    diamonds,
    diamondShapes: shapes.join(", "),
    totalDiamonds: counts.join(", "),
    diamondWeightEach: weights.join(", "),
    totalDiamondWeight: specMap["Total Diamond Weight"] || "",
    size: specMap["Size"] || "",
    dimensions: specMap["Dimensions"] || "",
    prices,
  };
}

// ========================================
// FETCH PRODUCTS
// ========================================
async function fetchAllProducts() {
  const allProducts = [];

  const collectionsData = await shopifyRequest(GET_ALL_COLLECTIONS);
  const collections = collectionsData.data.collections.edges.map((e) => e.node);

  console.log(`\n📦 Found ${collections.length} collections\n`);

  for (const collection of collections) {
    console.log(`  📂 ${collection.title}...`);

    const collectionData = await shopifyRequest(GET_COLLECTION_PRODUCTS, {
      handle: collection.handle,
    });

    const products =
      collectionData.data.collection?.products?.edges?.map((e) => e.node) || [];
    allProducts.push(...products);
    console.log(`     ✓ ${products.length} products`);
  }

  const uniqueProducts = Array.from(
    new Map(allProducts.map((p) => [p.handle, p])).values()
  );

  console.log(`\n✓ Total: ${uniqueProducts.length} unique products`);
  return uniqueProducts;
}

// ========================================
// CSV CONVERSION – FIXED
// ========================================
function convertToCSV(data) {
  const headers = [
    "Handle",
    "Title",
    "10K Weight (g)",
    "14K Weight (g)",
    "18K Weight (g)",
    "Diamond Shapes",
    "Total Diamonds",
    "Diamond Weight (each)",
    "Total Diamond Weight",
    "Size",
    "Dimensions",
    "10K Price",
    "14K Price",
    "18K Price",
    "Diamond Price",
    "Gold Price (14K)",
    "Making Charge",
    "GST",
    "Total Price (14K)",
  ];

  const rows = data.map((item) => {
    const price14K = item.prices["14K"] || {};

    // Proper CSV escaping: wrap in quotes and escape internal quotes
    const escapeCSV = (value) => {
      if (value == null || value === "") return "";
      const str = value.toString();
      // Always wrap in quotes and escape any internal quotes
      return `"${str.replace(/"/g, '""')}"`;
    };

    return [
      escapeCSV(item.handle),
      escapeCSV(item.title),
      item.goldWeights["10K"] ?? "",
      item.goldWeights["14K"] ?? "",
      item.goldWeights["18K"] ?? "",
      escapeCSV(item.diamondShapes), // "round, round, round, round"
      escapeCSV(item.totalDiamonds), // "12, 12, 8, 1"
      escapeCSV(item.diamondWeightEach), // "0.006, 0.008, 0.012, 0.07"
      escapeCSV(item.totalDiamondWeight), // "0.072,0.096, 0.096,0.07ct"
      escapeCSV(item.size),
      escapeCSV(item.dimensions),
      item.prices["10K"]?.total ?? "",
      item.prices["14K"]?.total ?? "",
      item.prices["18K"]?.total ?? "",
      price14K.diamondPrice ?? "",
      price14K.goldPrice ?? "",
      price14K.makingCharge ?? "",
      price14K.gst ?? "",
      price14K.total ?? "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
// ========================================
// MAIN
// ========================================
async function main() {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  Product Price Calculator & Exporter  ║");
  console.log("╚════════════════════════════════════════╝\n");

  try {
    console.log("⚙️  Fetching pricing configuration...");
    const config = await getPricingConfig();

    console.log("💰 Fetching gold price...");
    const gold24Price = await getGoldPrice();
    console.log(`   Current 24K: ₹${gold24Price.toFixed(2)}/g`);

    const products = await fetchAllProducts();

    console.log("\n🔄 Processing products...");
    const processedData = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const percent = Math.round(((i + 1) / products.length) * 100);
      process.stdout.write(`\r   [${percent}%] ${i + 1}/${products.length}`);

      try {
        const data = processProduct(product, config, gold24Price);
        processedData.push(data);
      } catch (error) {
        errors.push({ handle: product.handle, error: error.message });
      }
    }

    console.log("\n\n📝 Generating CSV...");
    const csv = convertToCSV(processedData);

    const outputDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = path.join(outputDir, `product-prices-${Date.now()}.csv`);
    fs.writeFileSync(filename, csv);

    console.log(`\n✅ Success! Exported ${processedData.length} products`);
    console.log(`📄 File: ${filename}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  ${errors.length} errors encountered`);
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

main();
