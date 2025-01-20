const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name:{ type: String, required: true },
    role: { type: String, required: true, enum: ['buyer', 'seller'] },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    shopDetails: { type: String, required: function () { return this.role === 'seller'; } },
    gst: { type: String, required: function () { return this.role === 'seller'; } },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema); 
