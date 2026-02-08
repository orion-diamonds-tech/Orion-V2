// src/utils/cartSync.js - MongoDB Version

export async function syncCartToMongoDB(customerEmail) {
  try {
    const localCart = JSON.parse(localStorage.getItem("cart") || "[]");

    if (localCart.length === 0) {
      console.log("No local cart items to sync");
      return { success: true, itemCount: 0 };
    }

    // Validate cart items
    const validCartItems = localCart.filter((item) => {
      if (!item.variantId || !item.handle || !item.quantity) {
        console.warn("Skipping invalid cart item:", item);
        return false;
      }
      return true;
    });

    if (validCartItems.length === 0) {
      console.log("No valid cart items to sync");
      return { success: true, itemCount: 0 };
    }

    // Save to MongoDB
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: customerEmail,
        items: validCartItems,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save cart to server");
    }

    const result = await response.json();
    console.log(`✅ Synced ${result.itemCount} items to MongoDB`);

    return result;
  } catch (error) {
    console.error("Error syncing cart to MongoDB:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Load cart from MongoDB on login
 */
export async function loadCartFromMongoDB(customerEmail) {
  try {
    const response = await fetch(
      `/api/cart?email=${encodeURIComponent(customerEmail)}`
    );

    if (!response.ok) {
      throw new Error("Failed to load cart from server");
    }

    const data = await response.json();

    if (!data.success || !data.items || data.items.length === 0) {
      console.log("No cart items found in MongoDB");
      return [];
    }

    // Update local cart with MongoDB data
    localStorage.setItem("cart", JSON.stringify(data.items));
    console.log(`✅ Loaded ${data.itemCount} items from MongoDB`);

    return data.items;
  } catch (error) {
    console.error("Error loading cart from MongoDB:", error);
    return [];
  }
}

/**
 * Add single item to MongoDB cart
 */
export async function addItemToMongoDBCart(customerEmail, item) {
  try {
    const response = await fetch("/api/cart/item", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: customerEmail,
        item,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to add item to cart");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error adding item to MongoDB cart:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update item quantity in MongoDB cart
 */
export async function updateQuantityInMongoDB(
  customerEmail,
  variantId,
  quantity
) {
  try {
    const response = await fetch("/api/cart/quantity", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: customerEmail,
        variantId,
        quantity,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update quantity");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error updating quantity in MongoDB:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove item from MongoDB cart
 */
export async function removeItemFromMongoDB(customerEmail, variantId) {
  try {
    const response = await fetch(
      `/api/cart?email=${encodeURIComponent(
        customerEmail
      )}&variantId=${encodeURIComponent(variantId)}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to remove item");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error removing item from MongoDB:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear cart in MongoDB
 */
export async function clearMongoDBCart(customerEmail) {
  try {
    const response = await fetch(
      `/api/cart?email=${encodeURIComponent(customerEmail)}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to clear cart");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error clearing MongoDB cart:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Merge local and MongoDB carts (keep highest quantity for duplicates)
 */
export async function mergeLocalAndMongoDBCart(customerEmail) {
  try {
    const localCart = JSON.parse(localStorage.getItem("cart") || "[]");

    // Get MongoDB cart
    const mongoResponse = await fetch(
      `/api/cart?email=${encodeURIComponent(customerEmail)}`
    );
    const mongoData = await mongoResponse.json();
    const mongoCart = mongoData.items || [];

    if (localCart.length === 0 && mongoCart.length === 0) {
      return [];
    }

    // Merge carts - keep highest quantity for duplicates
    const mergedMap = new Map();

    // Add MongoDB items first
    mongoCart.forEach((item) => {
      mergedMap.set(item.variantId, item);
    });

    // Add/merge local items
    localCart.forEach((item) => {
      const existing = mergedMap.get(item.variantId);
      if (existing) {
        // Keep higher quantity
        if (item.quantity > existing.quantity) {
          mergedMap.set(item.variantId, item);
        }
      } else {
        mergedMap.set(item.variantId, item);
      }
    });

    const mergedCart = Array.from(mergedMap.values());

    // Save merged cart to MongoDB
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: customerEmail,
        items: mergedCart,
      }),
    });

    // Update local storage
    localStorage.setItem("cart", JSON.stringify(mergedCart));

    console.log(`✅ Merged cart: ${mergedCart.length} total items`);
    return mergedCart;
  } catch (error) {
    console.error("Error merging carts:", error);
    return localCart; // Fallback to local cart
  }
}
