"use client";
import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Download,
  FileText,
  ShoppingCart,
  ChevronLeft,
} from "lucide-react";

// Storage keys for persistent storage
const STORAGE_KEYS = {
  customers: "orion_erp_customers",
  enquiries: "orion_erp_enquiries",
  orders: "orion_erp_orders",
};

// Utility functions for persistent storage with proper error handling
const getFromStorage = async (key) => {
  try {
    // Check if window.storage exists
    if (
      typeof window !== "undefined" &&
      window.storage &&
      typeof window.storage.get === "function"
    ) {
      const result = await window.storage.get(key);
      return result ? JSON.parse(result.value) : [];
    } else {
      // Fallback to localStorage if window.storage is not available
      if (typeof window !== "undefined" && window.localStorage) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
      }
    }
    return [];
  } catch (error) {
    console.error("Error reading from storage:", error);
    return [];
  }
};

const saveToStorage = async (key, data) => {
  try {
    // Check if window.storage exists
    if (
      typeof window !== "undefined" &&
      window.storage &&
      typeof window.storage.set === "function"
    ) {
      await window.storage.set(key, JSON.stringify(data));
    } else {
      // Fallback to localStorage if window.storage is not available
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    }
  } catch (error) {
    console.error("Error saving to storage:", error);
  }
};

// Format number in Indian currency style - matching HTML file
const formatIndianCurrency = (num) => {
  const n = parseFloat(num) || 0;
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

// Clean and parse currency input - matching HTML file
const parseAmount = (value) => {
  if (!value) return 0;
  // Remove ₹ symbol, commas, and spaces
  const cleaned = String(value).replace(/[₹,\s]/g, "");
  return parseFloat(cleaned) || 0;
};

// Customer List Component
const CustomerList = ({ onSelectCustomer }) => {
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await getFromStorage(STORAGE_KEYS.customers);
    setCustomers(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Customer name is required");
      return;
    }

    const updatedCustomers = editingCustomer
      ? customers.map((c) =>
          c.id === editingCustomer.id ? { ...formData, id: c.id } : c
        )
      : [...customers, { ...formData, id: Date.now().toString() }];

    setCustomers(updatedCustomers);
    await saveToStorage(STORAGE_KEYS.customers, updatedCustomers);
    resetForm();
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      const updated = customers.filter((c) => c.id !== id);
      setCustomers(updated);
      await saveToStorage(STORAGE_KEYS.customers, updated);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", address: "" });
    setEditingCustomer(null);
    setShowModal(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-[#0a1833]">
              Customer Management
            </h1>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#0a1833] text-white px-4 py-2 rounded-lg hover:bg-[#142850] transition"
            >
              <Plus size={20} />
              Add Customer
            </button>
          </div>

          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          />

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Address
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No customers found. Click "Add Customer" to get started.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-t hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => onSelectCustomer(customer)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {customer.phone || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {customer.address || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(customer);
                          }}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(customer.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#0a1833]">
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                  rows="3"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#0a1833] text-white py-2 rounded-lg hover:bg-[#142850] transition"
                >
                  {editingCustomer ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Customer Details Component
const CustomerDetails = ({ customer, onBack }) => {
  const [activeTab, setActiveTab] = useState("enquiries");
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    itemName: "",
    goldKarat: "18kt",
    goldWeight: "",
    goldValue: "",
    makingCharges: "",
    diamondCarats: "",
    diamondValue: "",
    designUrl: "",
    gstType: "cgst_sgst", // Default to CGST+SGST
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab, customer.id]);

  const loadData = async () => {
    setLoading(true);
    const storageKey =
      activeTab === "enquiries" ? STORAGE_KEYS.enquiries : STORAGE_KEYS.orders;
    const allData = await getFromStorage(storageKey);
    const customerData = allData.filter(
      (item) => item.customerId === customer.id
    );
    setItems(customerData);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const storageKey =
      activeTab === "enquiries" ? STORAGE_KEYS.enquiries : STORAGE_KEYS.orders;
    const allData = await getFromStorage(storageKey);

    const itemData = {
      ...formData,
      customerId: customer.id,
      id: editingItem ? editingItem.id : Date.now().toString(),
      totalPrice: calculateTotal(formData),
    };

    const updatedData = editingItem
      ? allData.map((item) => (item.id === editingItem.id ? itemData : item))
      : [...allData, itemData];

    await saveToStorage(storageKey, updatedData);
    await loadData();
    resetForm();
  };

  const handleDelete = async (id) => {
    if (
      confirm(
        `Are you sure you want to delete this ${
          activeTab === "enquiries" ? "enquiry" : "order"
        }?`
      )
    ) {
      const storageKey =
        activeTab === "enquiries"
          ? STORAGE_KEYS.enquiries
          : STORAGE_KEYS.orders;
      const allData = await getFromStorage(storageKey);
      const updated = allData.filter((item) => item.id !== id);
      await saveToStorage(storageKey, updated);
      await loadData();
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      date: item.date,
      itemName: item.itemName,
      goldKarat: item.goldKarat,
      goldWeight: item.goldWeight,
      goldValue: item.goldValue,
      makingCharges: item.makingCharges,
      diamondCarats: item.diamondCarats,
      diamondValue: item.diamondValue,
      designUrl: item.designUrl || "",
      gstType: item.gstType || "cgst_sgst",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      itemName: "",
      goldKarat: "18kt",
      goldWeight: "",
      goldValue: "",
      makingCharges: "",
      diamondCarats: "",
      diamondValue: "",
      designUrl: "",
      gstType: "cgst_sgst",
    });
    setEditingItem(null);
    setShowModal(false);
  };

  // Calculate total matching HTML file logic exactly
  const calculateTotal = (data) => {
    const goldValue = parseAmount(data.goldValue);
    const makingCharges = parseAmount(data.makingCharges);
    const diamondValue = parseAmount(data.diamondValue);
    const subtotal = goldValue + makingCharges + diamondValue;

    // Add GST based on type
    const gstType = data.gstType || "cgst_sgst";
    let gstAmount = 0;

    if (gstType === "cgst_sgst") {
      gstAmount = subtotal * 0.03; // 1.5% + 1.5% = 3%
    } else {
      gstAmount = subtotal * 0.03; // 3%
    }

    const total = subtotal + gstAmount;
    return formatIndianCurrency(total);
  };

  const convertToOrder = async (enquiry) => {
    if (confirm("Convert this enquiry to an order?")) {
      // Remove from enquiries
      const enquiries = await getFromStorage(STORAGE_KEYS.enquiries);
      const updatedEnquiries = enquiries.filter((e) => e.id !== enquiry.id);
      await saveToStorage(STORAGE_KEYS.enquiries, updatedEnquiries);

      // Add to orders with new ID and current date
      const orders = await getFromStorage(STORAGE_KEYS.orders);
      const orderData = {
        ...enquiry,
        id: Date.now().toString(),
        date: new Date().toISOString().split("T")[0],
      };
      await saveToStorage(STORAGE_KEYS.orders, [...orders, orderData]);

      // Refresh data
      await loadData();
    }
  };

  const generateInvoice = (order) => {
    // Calculate values matching HTML file exactly
    const goldValue = parseAmount(order.goldValue);
    const makingCharges = parseAmount(order.makingCharges);
    const diamondValue = parseAmount(order.diamondValue);
    const subtotal = goldValue + makingCharges + diamondValue;

    // GST calculation based on type matching HTML file
    const gstType = order.gstType || "cgst_sgst";
    let cgst = 0,
      sgst = 0,
      igst = 0;

    if (gstType === "cgst_sgst") {
      cgst = subtotal * 0.015;
      sgst = subtotal * 0.015;
    } else {
      igst = subtotal * 0.03;
    }

    const total = subtotal + cgst + sgst + igst;

    const invoiceWindow = window.open("", "_blank");
    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Invoice - ${customer.name}</title>
          <style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    background: #f5f6f7;
    font-size: 12px;
  }

  .invoice {
    width: 780px; /* A4 friendly */
    margin: 20px auto;
    background: white;
    padding: 20px;
    border: 1px solid #ddd;
  }

  .inv-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .inv-left h2 {
    font-size: 22px;
    margin-bottom: 6px;
  }

  .inv-left p {
    margin: 2px 0;
    font-size: 11px;
  }

  .logo {
    width: 100px;
  }

  .divider {
    border-top: 1.5px solid #333;
    margin: 12px 0;
  }

  .inv-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 11px;
  }

  .cust-table {
    width: 100%;
    margin: 10px 0;
    font-size: 11px;
  }

  .cust-table td {
    padding: 5px;
    vertical-align: top;
  }

  .item-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 11px;
  }

  .item-table thead th {
    background: #333;
    color: white;
    padding: 6px;
    text-align: left;
    border: 1px solid #333;
  }

  .item-table td {
    padding: 6px;
    border: 1px solid #ddd;
  }

  .item-table tr:nth-child(even) {
    background: #f9f9f9;
  }

  .summary-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
  }

  .gst-table {
    width: 340px;
    border-collapse: collapse;
    font-size: 11px;
  }

  .gst-table td {
    padding: 6px 10px;
    border-bottom: 1px solid #ddd;
  }

  .gst-table td:first-child {
    font-weight: 600;
  }

  .gst-table td:last-child {
    text-align: right;
  }

  .gst-table .grand-total td {
    border-top: 2px solid #333;
    border-bottom: 2px solid #333;
    font-size: 13px;
    font-weight: 700;
    background: #f0f0f0;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
    font-size: 11px;
  }

  .bank-box h3 {
    font-size: 13px;
    margin-bottom: 5px;
  }

  .bank-box p {
    margin: 3px 0;
  }

  .stamp-crop {
    width: 90px;
    height: 100px;
    overflow: hidden;
    margin-left: auto;
    margin-bottom: 5px;
  }

  .stamp-img {
    width: 90px;
  }

  @media print {
    body {
      background: white;
    }

    .invoice {
      width: 100%;
      margin: 0;
      padding: 15px;
      border: none;
    }
  }
</style>

        </head>
        <body>
          <div class="invoice">
            <div class="inv-header">
              <div class="inv-left">
                <h2>ORION DIAMONDS</h2>
                <p>GAT NO 331-338, Plot No. 2,</p>
                <p>Near BJP Market, Tal Hatkanangale,</p>
                <p>Ichalkaranji, Kolhapur, Maharashtra - 416115</p>
                <p>Phone: +91-7022253092</p>
                <p>Email:  info@oriondiamonds.in</p>
                <p>GSTIN: 27BRDPJ6385G1ZJ</p>
              </div>
              <div class="inv-right">
                <img src="logo.jpg" class="logo" alt="Logo" onerror="this.style.display='none'" />
              </div>
            </div>

            <hr class="divider" />

            <div class="inv-row">
              <div>
                <p><b>Invoice No:</b> ${
                  new Date().getMonth() + 1
                }-${new Date().getFullYear()}-${order.id.slice(-4)}</p>
              </div>
              <div>
                <p><b>Invoice Date:</b> ${order.date}</p>
              </div>
            </div>

            <table class="cust-table">
              <tr>
                <td width="15%"><b>Customer Name:</b></td>
                <td width="35%">${customer.name}</td>
                <td width="15%"><b>Billing Address:</b></td>
                <td width="35%">${customer.address || customer.name}</td>
              </tr>
              <tr>
                <td><b>Contact:</b></td>
                <td>${customer.phone || "-"}</td>
                <td><b>Shipping Address:</b></td>
                <td>${customer.address || customer.name}</td>
              </tr>
            </table>

            <table class="item-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Gold Purity</th>
                  <th>Gold Weight (g)</th>
                  <th>Gold Value</th>
                  <th>Making Charges</th>
                  <th>Diamond Carats</th>
                  <th>Diamond Value</th>
                  <th>Total Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${order.itemName || "-"}</td>
                  <td>${order.goldKarat}</td>
                  <td>${parseFloat(order.goldWeight || 0).toFixed(2)}</td>
                  <td>${formatIndianCurrency(goldValue)}</td>
                  <td>${formatIndianCurrency(makingCharges)}</td>
                  <td>${parseFloat(order.diamondCarats || 0).toFixed(2)}</td>
                  <td>${formatIndianCurrency(diamondValue)}</td>
                  <td><b>${formatIndianCurrency(subtotal)}</b></td>
                </tr>
              </tbody>
            </table>

            <div class="summary-section">
              <table class="gst-table">
                <tr>
                  <td>Subtotal</td>
                  <td>${formatIndianCurrency(subtotal)}</td>
                </tr>
                ${
                  gstType === "cgst_sgst"
                    ? `
                <tr>
                  <td>CGST (1.5%)</td>
                  <td>${formatIndianCurrency(cgst)}</td>
                </tr>
                <tr>
                  <td>SGST (1.5%)</td>
                  <td>${formatIndianCurrency(sgst)}</td>
                </tr>
                `
                    : `
                <tr>
                  <td>IGST (3%)</td>
                  <td>${formatIndianCurrency(igst)}</td>
                </tr>
                `
                }
                <tr class="grand-total">
                  <td>Grand Total</td>
                  <td>${formatIndianCurrency(total)}</td>
                </tr>
              </table>
            </div>

            <div class="footer">
              <div class="bank-box">
                <h3>Bank Details</h3>
                <p>Ac No: 925020038972487</p>
                <p>IFSC: UTIB0000606</p>
                <p>Bank: Axis Bank</p>
                <p>Branch: Ichalkaranji</p>
              </div>
              <div class="sign-box">
                <div class="stamp-crop">
                  <img src="stamporg.png" class="stamp-img" alt="Stamp" onerror="this.style.display='none'" />
                </div>
                <p>__________________________</p>
                <p>Authorized Signatory</p>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="text-[#0a1833] hover:text-[#142850]"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[#0a1833]">
                {customer.name}
              </h1>
              <p className="text-gray-600">
                {customer.phone && `${customer.phone} • `}
                {customer.address || "No address"}
              </p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab("enquiries")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === "enquiries"
                  ? "bg-[#0a1833] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FileText size={20} />
              Enquiries
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === "orders"
                  ? "bg-[#0a1833] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <ShoppingCart size={20} />
              Orders
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#0a1833] text-white px-4 py-2 rounded-lg hover:bg-[#142850] transition ml-auto"
            >
              <Plus size={20} />
              Add {activeTab === "enquiries" ? "Enquiry" : "Order"}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No {activeTab} found. Click "Add{" "}
              {activeTab === "enquiries" ? "Enquiry" : "Order"}" to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0a1833]">
                        {item.itemName || "Unnamed Item"}
                      </h3>
                      <p className="text-sm text-gray-600">{item.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeTab === "enquiries" && (
                        <button
                          onClick={() => convertToOrder(item)}
                          className="text-green-600 hover:text-green-800 px-3 py-1 rounded border border-green-600 hover:bg-green-50 transition text-sm"
                        >
                          Convert to Order
                        </button>
                      )}
                      {activeTab === "orders" && (
                        <button
                          onClick={() => generateInvoice(item)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Generate Invoice"
                        >
                          <Download size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Gold:</span>
                      <p className="font-medium">
                        {item.goldKarat} •{" "}
                        {parseFloat(item.goldWeight || 0).toFixed(2)}g
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Gold Value:</span>
                      <p className="font-medium">
                        {formatIndianCurrency(parseAmount(item.goldValue))}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Making:</span>
                      <p className="font-medium">
                        {formatIndianCurrency(parseAmount(item.makingCharges))}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Diamond:</span>
                      <p className="font-medium">
                        {parseFloat(item.diamondCarats || 0).toFixed(2)}ct •{" "}
                        {formatIndianCurrency(parseAmount(item.diamondValue))}
                      </p>
                    </div>
                  </div>

                  {item.designUrl && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <a
                        href={item.designUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Design →
                      </a>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-gray-600 font-medium">
                      Total Price:
                    </span>
                    <span className="text-xl font-bold text-[#0a1833]">
                      {item.totalPrice}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#0a1833]">
                {editingItem ? "Edit" : "Add"}{" "}
                {activeTab === "enquiries" ? "Enquiry" : "Order"}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) =>
                      setFormData({ ...formData, itemName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                    placeholder="Ring, Necklace, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gold Purity/Karat
                  </label>
                  <select
                    value={formData.goldKarat}
                    onChange={(e) =>
                      setFormData({ ...formData, goldKarat: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                  >
                    <option value="18kt">18kt</option>
                    <option value="22kt">22kt</option>
                    <option value="14kt">14kt</option>
                    <option value="24kt">24kt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gold Weight (g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.goldWeight}
                    onChange={(e) =>
                      setFormData({ ...formData, goldWeight: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gold Total Value (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.goldValue}
                    onChange={(e) =>
                      setFormData({ ...formData, goldValue: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gold Making Charges (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.makingCharges}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        makingCharges: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diamond Total Carats
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.diamondCarats}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        diamondCarats: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diamond Total Value (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.diamondValue}
                    onChange={(e) =>
                      setFormData({ ...formData, diamondValue: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Design URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.designUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, designUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1833]"
                    placeholder="https://"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Type
                  </label>
                  <div className="flex gap-6 p-3 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gstType"
                        value="cgst_sgst"
                        checked={formData.gstType === "cgst_sgst"}
                        onChange={(e) =>
                          setFormData({ ...formData, gstType: e.target.value })
                        }
                        className="w-4 h-4 text-[#0a1833] focus:ring-[#0a1833]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        CGST (1.5%) + SGST (1.5%)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gstType"
                        value="igst"
                        checked={formData.gstType === "igst"}
                        onChange={(e) =>
                          setFormData({ ...formData, gstType: e.target.value })
                        }
                        className="w-4 h-4 text-[#0a1833] focus:ring-[#0a1833]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        IGST (3%)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">
                    Total Price:
                  </span>
                  <span className="text-2xl font-bold text-[#0a1833]">
                    {calculateTotal(formData)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-[#0a1833] text-white py-2 rounded-lg hover:bg-[#142850] transition"
                >
                  {editingItem ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
export default function OrionMiniERP() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  return (
    <div className="mt-30">
      {selectedCustomer ? (
        <CustomerDetails
          customer={selectedCustomer}
          onBack={() => setSelectedCustomer(null)}
        />
      ) : (
        <CustomerList onSelectCustomer={setSelectedCustomer} />
      )}
    </div>
  );
}
