const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
// Define the product schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    // productId: { type: String, required: true, unique: true }, 
    sellerId: { type: String, required: true } // Reference to the seller
});

// Auto-generate product ID
// productSchema.pre('save', function (next) {
//     if (!this.productId) {
//         this.productId = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
//     }
//     next();
// });

// Create the model
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
