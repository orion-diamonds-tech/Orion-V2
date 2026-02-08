import { NextResponse } from "next/server";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;

export async function POST(request) {
  try {
    const { cartItems, customerEmail } = await request.json();

    const lineItems = cartItems.map((item) => {
      const calculatedPrice = item.calculatedPrice || item.price;

      let fullTitle = item.title;
      if (item.variantTitle && item.variantTitle !== "Default Title") {
        fullTitle += ` - ${item.variantTitle}`;
      }

      return {
        title: fullTitle,
        price: calculatedPrice.toFixed(2),
        quantity: item.quantity,
        taxable: true,
        requires_shipping: false, // ← Change to false
        grams: 0, // ← Set to 0
        properties:
          item.selectedOptions?.map((opt) => ({
            name: opt.name,
            value: opt.value,
          })) || [],
      };
    });

    console.log("Line Items Payload:", JSON.stringify(lineItems, null, 2));

    // Create draft order
    const response = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2024-10/draft_orders.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ADMIN_API_TOKEN,
        },
        body: JSON.stringify({
          draft_order: {
            line_items: lineItems,
            email: customerEmail,
            use_customer_default_address: true,
          },
        }),
      }
    );

    const data = await response.json();

    console.log("Shopify Draft Order Response:", JSON.stringify(data, null, 2));

    if (data.draft_order) {
      return NextResponse.json({
        success: true,
        invoiceUrl: data.draft_order.invoice_url,
      });
    } else {
      console.error("Draft order creation failed:", data.errors);
      throw new Error(
        data.errors ? JSON.stringify(data.errors) : "Failed to create order"
      );
    }
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
