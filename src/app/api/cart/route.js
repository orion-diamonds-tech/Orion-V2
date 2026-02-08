// src/app/api/cart/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// MongoDB connection
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
    isConnected = true;
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

// Cart Schema - stores the actual cart items
const CartSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    items: [
      {
        variantId: { type: String, required: true },
        handle: { type: String, required: true },
        title: { type: String, required: true },
        variantTitle: String,
        image: String,
        price: Number,
        calculatedPrice: Number,
        currencyCode: { type: String, default: "INR" },
        quantity: { type: Number, required: true, min: 1 },
        selectedOptions: [
          {
            name: String,
            value: String,
          },
        ],
        descriptionHtml: String,
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

const Cart = mongoose.models.Cart || mongoose.model("Cart", CartSchema);

/**
 * GET /api/cart?email=customer@email.com
 * Fetch cart items for customer
 */
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const cart = await Cart.findOne({ email: email.toLowerCase() });

    return NextResponse.json({
      success: true,
      items: cart?.items || [],
      itemCount: cart?.items?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart
 * Save/update entire cart for customer
 */
export async function POST(request) {
  try {
    await connectDB();

    const { email, items } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items must be an array" },
        { status: 400 }
      );
    }

    // Validate items
    const validItems = items.filter((item) => {
      return (
        item &&
        item.variantId &&
        item.handle &&
        item.title &&
        item.quantity &&
        item.quantity > 0
      );
    });

    if (validItems.length !== items.length) {
      console.warn(
        `Filtered out ${items.length - validItems.length} invalid items`
      );
    }

    // Upsert (update or insert) cart
    const cart = await Cart.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        email: email.toLowerCase(),
        items: validItems,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return NextResponse.json({
      success: true,
      itemCount: cart.items.length,
      message: "Cart saved successfully",
    });
  } catch (error) {
    console.error("Error saving cart:", error);
    return NextResponse.json(
      { error: "Failed to save cart", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cart/item
 * Add or update a single item in cart
 */
export async function PUT(request) {
  try {
    await connectDB();

    const { email, item } = await request.json();

    if (!email || !item) {
      return NextResponse.json(
        { error: "Email and item required" },
        { status: 400 }
      );
    }

    // Validate item
    if (
      !item.variantId ||
      !item.handle ||
      !item.title ||
      !item.quantity ||
      item.quantity < 1
    ) {
      return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
    }

    const cart = await Cart.findOne({ email: email.toLowerCase() });

    if (!cart) {
      // Create new cart with this item
      const newCart = await Cart.create({
        email: email.toLowerCase(),
        items: [item],
      });

      return NextResponse.json({
        success: true,
        itemCount: newCart.items.length,
        message: "Item added to new cart",
      });
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(
      (i) => i.variantId === item.variantId
    );

    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex] = {
        ...cart.items[existingItemIndex].toObject(),
        ...item,
      };
    } else {
      // Add new item
      cart.items.push(item);
    }

    await cart.save();

    return NextResponse.json({
      success: true,
      itemCount: cart.items.length,
      message: "Item added/updated successfully",
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    return NextResponse.json(
      { error: "Failed to update cart item", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart?email=customer@email.com
 * Clear entire cart for customer
 */
export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const variantId = searchParams.get("variantId");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (variantId) {
      // Remove specific item from cart
      const cart = await Cart.findOne({ email: email.toLowerCase() });

      if (!cart) {
        return NextResponse.json({
          success: true,
          message: "Cart not found",
        });
      }

      cart.items = cart.items.filter((item) => item.variantId !== variantId);
      await cart.save();

      return NextResponse.json({
        success: true,
        itemCount: cart.items.length,
        message: "Item removed from cart",
      });
    } else {
      // Clear entire cart
      await Cart.deleteOne({ email: email.toLowerCase() });

      return NextResponse.json({
        success: true,
        message: "Cart cleared",
      });
    }
  } catch (error) {
    console.error("Error deleting cart:", error);
    return NextResponse.json(
      { error: "Failed to delete cart", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cart/quantity
 * Update item quantity
 */
export async function PATCH(request) {
  try {
    await connectDB();

    const { email, variantId, quantity } = await request.json();

    if (!email || !variantId || !quantity) {
      return NextResponse.json(
        { error: "Email, variantId, and quantity required" },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ email: email.toLowerCase() });

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.variantId === variantId
    );

    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    return NextResponse.json({
      success: true,
      message: "Quantity updated",
    });
  } catch (error) {
    console.error("Error updating quantity:", error);
    return NextResponse.json(
      { error: "Failed to update quantity", details: error.message },
      { status: 500 }
    );
  }
}
