const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true, enum: ['buyer', 'seller'] },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // Seller-specific fields
    shopDetails: { type: String, required: function () { return this.role === 'seller'; } },
    gst: { type: String, required: function () { return this.role === 'seller'; } },

    // Cart for buyers (contains product name, product ID, and quantity)
    cart: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: { type: String, required: true },
        quantity: { type: Number, default: 1 }
    }],

    // Orders array (storing the last 5 orders)
    orders: [{
        items: [{
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            productName: String,
            quantity: Number,
            price: Number
        }],
        address: {  // Change from String to an Object
            name: String,
            address: String,
            city: String,
            state: String,
            zip: String
        },
        totalAmount: Number,
        paymentMethod: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
