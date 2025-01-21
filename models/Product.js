// models/Product.js
const mongoose = require('mongoose');

// Define the product schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    productId: { type: String, unique: true }, // Automatically set
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Reference to the seller
});

// Middleware to auto-generate the product ID before saving
productSchema.pre('save', function (next) {
    if (!this.productId) {
        this.productId = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    next();
});

// Create the model
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
