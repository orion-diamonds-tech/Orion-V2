// src/models/PricingConfig.js
import mongoose from "mongoose";

const pricingConfigSchema = new mongoose.Schema({
  diamondMargins: {
    lessThan1ct: {
      multiplier: { type: Number, required: true },
      flatAddition: { type: Number, required: true },
      description: { type: String },
    },
    greaterThan1ct: {
      multiplier: { type: Number, required: true },
      flatAddition: { type: Number, required: true },
      description: { type: String },
    },
    baseFees: {
      fee1: { type: Number, required: true },
      fee2: { type: Number, required: true },
      description: { type: String },
    },
  },
  makingCharges: {
    lessThan2g: {
      ratePerGram: { type: Number, required: true },
      description: { type: String },
    },
    greaterThan2g: {
      ratePerGram: { type: Number, required: true },
      description: { type: String },
    },
    multiplier: { type: Number, required: true },
    description: { type: String },
  },
  gstRate: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: String, default: "system" },
});

// Use singleton: only one config document
export const PricingConfig =
  mongoose.models.PricingConfig ||
  mongoose.model("PricingConfig", pricingConfigSchema);
