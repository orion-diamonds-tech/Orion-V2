// src/app/admin/pricing/page.jsx
"use client";
import { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default function AdminPricingPortal() {
  const [config, setConfig] = useState(null);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [updatedBy, setUpdatedBy] = useState("");
  const [goldPrice, setGoldPrice] = useState(null);
  const [refreshingGold, setRefreshingGold] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchGoldPrice();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pricing-config");
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      showMessage("error", "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const fetchGoldPrice = async () => {
    try {
      const response = await fetch("/api/gold-price");
      const data = await response.json();
      if (data.success) {
        setGoldPrice(data);
      }
    } catch (error) {
      console.error("Failed to fetch gold price:", error);
    }
  };

  const refreshGoldPrice = async () => {
    try {
      setRefreshingGold(true);
      const response = await fetch("/api/gold-price", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setGoldPrice({
          ...data,
          price: data.price,
          date: data.date,
        });
        showMessage("success", "Gold price refreshed successfully!");
      } else {
        showMessage("error", "Failed to refresh gold price");
      }
    } catch (error) {
      showMessage("error", "Failed to refresh gold price");
    } finally {
      setRefreshingGold(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSave = async () => {
    if (!updatedBy.trim()) {
      showMessage("error", "Please enter your name");
      return;
    }

    if (!password.trim()) {
      showMessage("error", "Please enter admin password");
      return;
    }

    try {
      setSaving(true);

      const requestBody = {
        config: JSON.parse(JSON.stringify(config)),
        password: password.trim(),
        updatedBy: updatedBy.trim(),
      };

      console.log("Attempting to save configuration...");

      const response = await fetch("/api/pricing-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save configuration");
      }

      setConfig(result.config);
      showMessage("success", "Configuration saved successfully!");
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Save error:", error);
      showMessage("error", error.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset to default values?")) return;

    if (!password.trim()) {
      showMessage("error", "Please enter admin password");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/pricing-config/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password.trim(),
          updatedBy: updatedBy.trim() || "admin",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reset");
      }

      setConfig(result.config);
      showMessage("success", "Configuration reset to defaults");
    } catch (error) {
      console.error("Reset error:", error);
      showMessage("error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateConfigValue = (path, value) => {
    const pathArray = path.split(".");
    const newConfig = JSON.parse(JSON.stringify(config)); // Deep clone

    let current = newConfig;
    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]];
    }

    const parsedValue = parseFloat(value);
    current[pathArray[pathArray.length - 1]] = isNaN(parsedValue)
      ? value
      : parsedValue;

    setConfig(newConfig);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a1833]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 mt-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#0a1833]">
                Pricing Configuration
              </h1>
              <p className="text-gray-600 mt-1">
                Manage diamond and gold pricing margins
              </p>
              {config?.lastUpdated && (
                <p className="text-sm text-gray-500 mt-2">
                  Last updated: {new Date(config.lastUpdated).toLocaleString()}{" "}
                  by {config.updatedBy}
                </p>
              )}
            </div>
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        {/* Gold Price Display */}
        {goldPrice && (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl shadow-md p-6 mb-6 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0a1833] mb-2">
                  Current 24K Gold Price (Surat)
                </h2>
                <p className="text-3xl font-bold text-yellow-600">
                  ₹{goldPrice.price.toFixed(2)} / gram
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Last updated: {goldPrice.date}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {goldPrice.nextUpdate}
                </p>
              </div>
              <button
                onClick={refreshGoldPrice}
                disabled={refreshingGold}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <RefreshCw
                  className={`w-5 h-5 ${refreshingGold ? "animate-spin" : ""}`}
                />
                {refreshingGold ? "Refreshing..." : "Refresh Now"}
              </button>
            </div>
          </div>
        )}

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : message.type === "error"
                ? "bg-red-50 text-red-800"
                : "bg-blue-50 text-blue-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : message.type === "error" ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Diamond Margins */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-[#0a1833] mb-4">
            Diamond Margins
          </h2>

          <div className="space-y-6">
            {/* Less than 1ct */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Diamonds &lt; 1 Carat
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {config?.diamondMargins.lessThan1ct.description}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config?.diamondMargins.lessThan1ct.multiplier || 0}
                    onChange={(e) =>
                      updateConfigValue(
                        "diamondMargins.lessThan1ct.multiplier",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flat Addition (₹)
                  </label>
                  <input
                    type="number"
                    value={config?.diamondMargins.lessThan1ct.flatAddition || 0}
                    onChange={(e) =>
                      updateConfigValue(
                        "diamondMargins.lessThan1ct.flatAddition",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Greater than 1ct */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Diamonds ≥ 1 Carat
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {config?.diamondMargins.greaterThan1ct.description}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={
                      config?.diamondMargins.greaterThan1ct.multiplier || 0
                    }
                    onChange={(e) =>
                      updateConfigValue(
                        "diamondMargins.greaterThan1ct.multiplier",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Base Fees */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Base Fees</h3>
              <p className="text-sm text-gray-600 mb-4">
                {config?.diamondMargins.baseFees.description}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fee 1 (₹)
                  </label>
                  <input
                    type="number"
                    value={config?.diamondMargins.baseFees.fee1 || 0}
                    onChange={(e) =>
                      updateConfigValue(
                        "diamondMargins.baseFees.fee1",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fee 2 (₹)
                  </label>
                  <input
                    type="number"
                    value={config?.diamondMargins.baseFees.fee2 || 0}
                    onChange={(e) =>
                      updateConfigValue(
                        "diamondMargins.baseFees.fee2",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Making Charges */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-[#0a1833] mb-4">
            Making Charges
          </h2>

          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Gold Weight &lt; 2g
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {config?.makingCharges.lessThan2g.description}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate per Gram (₹)
                </label>
                <input
                  type="number"
                  value={config?.makingCharges.lessThan2g.ratePerGram || 0}
                  onChange={(e) =>
                    updateConfigValue(
                      "makingCharges.lessThan2g.ratePerGram",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Gold Weight ≥ 2g
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {config?.makingCharges.greaterThan2g.description}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate per Gram (₹)
                </label>
                <input
                  type="number"
                  value={config?.makingCharges.greaterThan2g.ratePerGram || 0}
                  onChange={(e) =>
                    updateConfigValue(
                      "makingCharges.greaterThan2g.ratePerGram",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Final Multiplier
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {config?.makingCharges.description}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multiplier
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config?.makingCharges.multiplier || 0}
                  onChange={(e) =>
                    updateConfigValue(
                      "makingCharges.multiplier",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* GST Rate */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-[#0a1833] mb-4">GST Rate</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Rate (decimal, e.g., 0.03 for 3%)
            </label>
            <input
              type="number"
              step="0.001"
              value={config?.gstRate || 0}
              onChange={(e) => updateConfigValue("gstRate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
            />
          </div>
        </div>

        {/* Admin Controls */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-[#0a1833] mb-4">
            Admin Controls
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={updatedBy}
                onChange={(e) => setUpdatedBy(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !password || !updatedBy}
                className="flex-1 bg-[#0a1833] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#142850] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={handleReset}
                disabled={saving || !password}
                className="px-6 py-3 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
