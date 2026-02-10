// src/app/my-cart/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { getProductByHandle } from "../../queries/products";
import toast from "react-hot-toast";
import CartItemPriceBreakup from "../../components/CartItemPriceBreakup";
import {
  updateQuantityOnServer,
  removeItemFromServer,
  clearServerCart,
} from "../../utils/cartSync";

export default function CartPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(null);

  // Resolve customerEmail + isLoggedIn safely (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("shopify_customer_token");
    const emailFromSession = session?.user?.email || null;
    const emailFromLocal = localStorage.getItem("customer_email");

    const finalEmail = emailFromSession || emailFromLocal || null;
    setCustomerEmail(finalEmail);
    setIsLoggedIn(!!token || !!finalEmail);
  }, [session]);

  // Load cart from localStorage and react to cartUpdated events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCart = async () => {
      const items = JSON.parse(localStorage.getItem("cart") || "[]");

      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          if (!item.descriptionHtml && item.handle) {
            try {
              const response = await getProductByHandle(item.handle);
              if (response?.product) {
                return {
                  ...item,
                  descriptionHtml: response.product.descriptionHtml,
                };
              }
            } catch (err) {
              console.error("Error fetching product details:", err);
            }
          }
          return item;
        })
      );

      setCartItems(enrichedItems);
    };

    loadCart();

    const handleCartUpdate = () => loadCart();
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, []);

  const updateQuantity = async (variantId, newQuantity) => {
    if (newQuantity < 1) return;

    const updatedCart = cartItems.map((item) =>
      item.variantId === variantId ? { ...item, quantity: newQuantity } : item
    );

    // Update localStorage + UI
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      window.dispatchEvent(new Event("cartUpdated"));
    }
    setCartItems(updatedCart);

    // Sync to server if logged in
    if (customerEmail) {
      try {
        await updateQuantityOnServer(customerEmail, variantId, newQuantity);
        console.log("✅ Quantity updated on server");
      } catch (error) {
        console.error("Failed to sync quantity to server:", error);
      }
    }
  };

  const removeItem = async (variantId) => {
    const updatedCart = cartItems.filter(
      (item) => item.variantId !== variantId
    );

    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      window.dispatchEvent(new Event("cartUpdated"));
    }
    setCartItems(updatedCart);

    if (customerEmail) {
      try {
        await removeItemFromServer(customerEmail, variantId);
        console.log("✅ Item removed from MongoDB");
        toast.success("Item removed from cart");
      } catch (error) {
        console.error("Failed to remove item from MongoDB:", error);
      }
    } else {
      toast.success("Item removed from cart");
    }
  };

  const clearCart = async () => {
    if (!window.confirm("Are you sure you want to clear your cart?")) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify([]));
      window.dispatchEvent(new Event("cartUpdated"));
    }
    setCartItems([]);

    if (customerEmail) {
      try {
        await clearServerCart(customerEmail);
        console.log("✅ Cart cleared on server");
        toast.success("Cart cleared");
      } catch (error) {
        console.error("Failed to clear cart on server:", error);
      }
    } else {
      toast.success("Cart cleared");
    }
  };

  const calculateSubtotal = () =>
    cartItems.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0
    );

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      toast.error("Please login to proceed to checkout");
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const email =
        customerEmail ||
        (typeof window !== "undefined"
          ? localStorage.getItem("customer_email")
          : null);

      if (!email) {
        toast.error("Customer email not found. Please login again.");
        router.push("/login");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cartItems,
          customerEmail: email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("cart", JSON.stringify([]));
          window.dispatchEvent(new Event("cartUpdated"));
        }
        setCartItems([]);

        if (email) {
          await clearServerCart(email);
        }

        toast.success("Redirecting to payment...");
        window.location.href = data.invoiceUrl;
      } else {
        toast.error(data.error || "Failed to create order");
        setError(data.error);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to create checkout");
      setError(`Failed to create checkout: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="py-50 text-center max-w-2xl mx-auto px-4 sm:px-6">
        <ShoppingCart className="w-20 h-20 mx-auto text-gray-300 mb-6" />
        <h1 className="text-4xl font-bold text-[#0a1833] mb-3">
          Your Cart is Empty
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Add some beautiful jewelry pieces to your cart.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-[#0a1833] text-white px-8 py-3 rounded-full hover:bg-[#1a2f5a] transition"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-25 mt-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-[#0a1833] text-center sm:text-left">
            Shopping Cart
          </h1>
          <button
            onClick={clearCart}
            className="text-red-600 hover:text-red-800 flex items-center gap-2 text-sm font-medium"
          >
            <Trash2 size={18} />
            Clear Cart
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.variantId}
                className="bg-white rounded-xl shadow-md p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-28 h-28 sm:w-24 sm:h-24 object-cover rounded-md"
                  />
                  <div className="flex-1 w-full text-center sm:text-left">
                    <h3 className="font-semibold text-lg text-[#0a1833]">
                      {item.title}
                    </h3>
                    {item.variantTitle &&
                      item.variantTitle !== "Default Title" && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.variantTitle}
                        </p>
                      )}
                    {item.selectedOptions &&
                      item.selectedOptions.length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          {item.selectedOptions.map((option, idx) => (
                            <span key={idx}>
                              {option.name}: {option.value}
                              {idx < item.selectedOptions.length - 1 && " • "}
                            </span>
                          ))}
                        </div>
                      )}
                    <p className="text-lg font-bold text-[#0a1833] mt-2">
                      ₹{parseFloat(item.calculatedPrice).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center justify-between gap-3 sm:gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="flex items-center justify-center border rounded-md">
                      <button
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity - 1)
                        }
                        className="p-2 hover:bg-gray-100 disabled:opacity-50"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="px-3 font-semibold text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity + 1)
                        }
                        className="p-2 hover:bg-gray-100"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="mt-4 text-lg font-bold text-[#0a1833]">
                      Total: ₹
                      {(item.calculatedPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                <CartItemPriceBreakup item={item} />
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-[#0a1833] mb-4">
                Order Summary
              </h2>
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">
                    ₹{calculateSubtotal().toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-[#0a1833] text-white py-3 rounded-full hover:bg-[#1a2f5a] transition disabled:opacity-50 font-semibold text-sm"
              >
                {loading ? "Processing..." : "Proceed to Checkout"}
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full mt-3 border border-[#0a1833] text-[#0a1833] py-3 rounded-full hover:bg-gray-50 transition font-semibold text-sm"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
