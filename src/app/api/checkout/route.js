// Creates a Razorpay order and a pending order in Supabase
import { NextResponse } from "next/server";
import razorpay from "../../../utils/razorpay.js";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

export async function POST(request) {
  try {
    const { cartItems, customerEmail } = await request.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cart is empty" },
        { status: 400 },
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: "Customer email is required" },
        { status: 400 },
      );
    }

    // Calculate total from cart items (use calculatedPrice if available, fallback to price)
    const subtotal = cartItems.reduce((total, item) => {
      const price = parseFloat(item.calculatedPrice || item.price) || 0;
      return total + price * (item.quantity || 1);
    }, 0);

    // Razorpay expects amount in paise (smallest currency unit)
    const amountInPaise = Math.round(subtotal * 100);

    if (amountInPaise < 100) {
      return NextResponse.json(
        { success: false, error: "Order amount must be at least ₹1" },
        { status: 400 },
      );
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    // Insert pending order into Supabase
    const { error: insertError } = await supabaseAdmin.from("orders").insert({
      customer_email: customerEmail.toLowerCase().trim(),
      items: cartItems,
      subtotal,
      currency: "INR",
      status: "pending",
      razorpay_order_id: razorpayOrder.id,
    });

    if (insertError) {
      console.error("Failed to create order record:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create order" },
      { status: 500 },
    );
  }
}
