require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();  

//___________________________________________________________________________________________________________
const server = http.createServer(app);
const io = new Server(server);

// Handle WebSocket connections
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
  
    // Broadcast message to all users
    socket.on("sendMessage", (message) => {
      io.emit("receiveMessage", { id: socket.id, message }); 
    });
  
    // Handle user disconnect
    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id); 
    }); 
  });

//___________________________________________________________________________________________________________


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'defaultSecretKey', // Hardcoded session secret 
    resave: false,
    saveUninitialized: true
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB connected");  
}).catch(err => console.log(err));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set views directory 
app.set('views', path.join(__dirname, 'dashboard'));
app.use(express.json());
// Static files
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));
// Import User model
const User = require('./models/User');
// Import Product model
const Product = require('./models/Product');  
const { Socket } = require('socket.io-client');
// const Request = require('./models/Request');


// Routes
// app.get('/', (req, res) => {
//     res.render('index', { user: req.session.user || null }); // Pass session user to index
// }); 

// Buyer Routes
app.get('/login/buyer', (req, res) => { 
    res.sendFile(path.join(__dirname, 'login', 'login-buyer.html')); // Buyer login page
});

app.get('/register/buyer', (req, res) => {
    res.sendFile(path.join(__dirname, 'register', 'register-buyer.html')); // Buyer registration page
});

app.post('/register-buyer', async (req, res) => {
    const { name, mobile, password } = req.body;

    try {
        let user = await User.findOne({ mobile });
        if (user) {
            return res.send('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            mobile,
            password: hashedPassword,
            role: 'buyer'
        });

        await newUser.save();
        return res.send('Buyer registered successfully');
    } catch (err) {
        console.error(err);
        res.send('Error registering buyer');
    }
});

app.post('/login-buyer', async (req, res) => {
    const { mobile, password } = req.body;

    try {
        let user = await User.findOne({ mobile, role: 'buyer' });

        if (!user) {
            return res.send('Invalid mobile number');
        } 

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.send('Invalid password');
        }

        req.session.user = {
            name: user.name,
            role: user.role,
            id: user._id
        };

        // Fetch products only if the user is a buyer
        if (req.session.user.role === 'buyer') {
            res.redirect('/buyer-dashboard');
        } else {
            res.redirect('/');  // For sellers, redirect to the homepage or seller dashboard
        }
    } catch (err) {
        console.error(err);
        res.send('Error logging in buyer');
    }
});

// Seller Routes
app.get('/login/seller', (req, res) => {
    res.sendFile(path.join(__dirname, 'login', 'login-seller.html')); // Seller login page
});

app.get('/register/seller', (req, res) => {
    res.sendFile(path.join(__dirname, 'register', 'register-seller.html')); // Seller registration page
});

app.post('/register-seller', async (req, res) => {
    const { name, mobile, password, shopDetails, gst } = req.body;

    try {
        let user = await User.findOne({ mobile });
        if (user) {
            return res.send('Mobile number already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            mobile,
            password: hashedPassword,
            shopDetails,
            gst,
            role: 'seller'
        });

        await newUser.save();
        return res.send('Seller registered successfully');
    } catch (err) {
        console.error(err);
        res.send('Error registering seller');
    }
});

app.post('/login-seller', async (req, res) => {
    const { mobile, password } = req.body;

    try {
        // Find seller by mobile number
        const user = await User.findOne({ mobile, role: 'seller' });

        if (!user) {
            return res.send("Invalid mobile number or password");
            // return res.status(400).render('login/login-seller', {
            //     message: 'Invalid mobile number or password',
            // }); // Send message back to login page
        }

        // Check password match
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.send("Wrong Password");
            // return res.status(400).render('login/login-seller', {
            //     message: 'Invalid mobile number or password',
            // }); // Avoid exposing password issues
        }
        // return res.redirect('/seller-dashboard');
        // Set session data 
        
        req.session.user = {
            name: user.name,
            role: user.role,
            id: user._id,
        };
       
        // Redirect to seller dashboard
        return res.redirect('/seller-dashboard');
    } catch (err) {
        console.error(err);
        return res.status(500).render('error', {
            message: 'Internal Server Error. Please try again later.',
        });
    } 
});

// Dashboard Routes
// Seller Dashboard
app.get('/seller-dashboard', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'seller') {
        return res.redirect('/');
    }
    try {
        const products = await Product.find({ sellerId: req.session.user.id });
        res.render('seller-dashboard', { user: req.session.user, products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.get('/buyer-dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'buyer') {
        return res.redirect('/');
    }
    Product.find()
        .then(products => {
            res.render('buyer-dashboard', { user: req.session.user, products: products, message: null });
        })
        .catch(err => {
            res.status(500).send("Error fetching products");
        });
});
//Cart route
app.get('/cart', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login/buyer'); // Redirect if user is not logged in
        }

        // Fetch user and populate cart with product details
        const user = await User.findById(req.session.user.id).populate('cart.productId');

        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render('cart', { user }); // Pass user to EJS template
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

app.get("/add-to-cart/:id", async (req, res) => {
    try {
        let flag = true;
        let message = "Item successfully added to the cart";
        const productId = req.params.id;

        if (!req.session.user) {
            return res.status(401).send("User not logged in");
        }

        // Fetch product details
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send("Product not found");
        }

        // Find the user and update cart
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.status(404).send("User not found");
        }

        // Check if the product is already in the cart
        const existingItem = user.cart.find(item => item.productId.toString() === productId);

        if (existingItem) {
            message='Item is already present in the cart';
            flag=false;
        }

        // Add product to user's cart
        if(flag){
            user.cart.push({
                productId: product._id,
                productName: product.name, // Ensure productName is saved
                price: product.price,
                quantity: 1,
            });
        }
    
        await user.save();
        Product.find()
        .then(products => {
            res.render('buyer-dashboard', { user: req.session.user, products: products, message });
        })
        .catch(err => {
            res.status(500).send("Error fetching products");
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

//Remove product from cart
app.post('/remove-from-cart/:productId', async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login/buyer');

        const user = await User.findById(req.session.user.id);
        user.cart = user.cart.filter(item => item.productId.toString() !== req.params.productId);
        await user.save();

        res.redirect('/cart');
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});
//checkout page
app.post('/checkout', async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login/buyer');

        const user = await User.findById(req.session.user.id);
        if (user.cart.length === 0) return res.redirect('/cart');
        res.render('checkout');
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

app.post('/place-order', async (req, res) => {
    try {
        const { name, address, city, state, zip, payment, email } = req.body;
        const user = await User.findById(req.session.user.id).populate('cart.productId');

        if (!user || user.cart.length === 0) {
            return res.redirect('/cart?error=Your cart is empty');
        }

        // Store order in database (limit to last 5 orders)
        if (!user.orders) user.orders = [];
        user.orders.unshift({
            items: user.cart,
            totalAmount: user.cart.reduce((sum, item) => sum + item.productId.price, 0) + 50,
            address: {address, city, state, zip },
            paymentMethod: payment,
            date: new Date()
        });

        // Keep only the last 5 orders
        if (user.orders.length > 5) {
            user.orders = user.orders.slice(0, 5);
        }

        user.cart = []; // Empty cart after checkout
        await user.save();

        // Send Confirmation Email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Replace with your email
                pass: process.env.EMAIL_PASS  // Replace with your app password
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Order Confirmation - Your Order has been Placed!',
            html: `<h2>Thank you for your order, ${name}!</h2>
                   <p>Your order has been placed successfully. Here are your order details:</p>
                   <ul>
                      ${user.orders[0].items.map(item => `<li>${item.productName} - ₹${item.productId.price}</li>`).join('')}
                   </ul>
                   <p><strong>Total Amount:</strong> ₹${user.orders[0].totalAmount}</p>
                   <p>We will ship your order to: ${address}, ${city}, ${state} - ${zip}</p>
                   <p>Payment Method: ${payment}</p>
                   <p>Thank you for shopping with us!</p>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email Error:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        res.redirect('/orders?success=Order placed successfully!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/orders', async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.status(404).send("User not found");
        }
        res.render('orders', { user });
    } catch (error) {
        console.error("Order fetching error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Add Product Route
app.post('/add-product', async (req, res) => { 
    if (!req.session.user || req.session.user.role !== 'seller') {
        return res.redirect('/');
    }
    const { name, description, price } = req.body;
    const sellerId = req.session.user.id;

    try {
        const newProduct = new Product({ name, description, price, sellerId });
        await newProduct.save();
        res.redirect('/seller-dashboard');
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send("Error adding product");
    }
});

//Smart-Buy
app.post('/smart-buy', async (req, res) => {
    const { productID, sellerID, productName, smartPrice } = req.body;

    if (!req.session.user || req.session.user.role !== 'buyer') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

});

//Product Routes

// Delete Product Route
app.post('/delete-product/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/seller-dashboard'); // Redirect back to seller dashboard
    } catch (error) {
        console.error(error);
        res.status(500).send("Error deleting product");
    }
});

// Edit Product Route (You need an edit form page)
app.get('/edit-product/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render('edit-product', { product });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching product details");
    }
});

app.post('/edit-product/:id', async (req, res) => {
    try {
        const { name, description, price } = req.body;
        await Product.findByIdAndUpdate(req.params.id, { name, description, price });
        res.redirect('/seller-dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating product");
    }
}); 

//Gemini api 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/ask", async (req, res) => { 
    try {
        const { prompt } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ reply: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//If the user is logged in and tries to access the index page, redirect them to their dashboard
app.get('/', (req, res) => { 
    if (req.session.user) {
        if (req.session.user.role === 'buyer') {
            return res.redirect('/buyer-dashboard');
        } else if (req.session.user.role === 'seller') {
            return res.redirect('/seller-dashboard');
        }
    }
    res.render('index', { user: null });
});


// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
