const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');

const app = express();  

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'defaultSecretKey', // Hardcoded session secret 
    resave: false,
    saveUninitialized: true
}));

// MongoDB connection
mongoose.connect("mongodb+srv://abhishekkumarmahto20000:sRylm00zvReR5qAe@cluster0.4guxi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB connected");  
}).catch(err => console.log(err));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set views directory 
app.set('views', path.join(__dirname, 'dashboard'));
 
// Static files
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));
// Import User model
const User = require('./models/User');
// Import Product model
const Product = require('./models/Product');  
// const Request = require('./models/Request');


// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user || null }); // Pass session user to index
}); 

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
            Product.find()
                .then(products => {
                    res.render('buyer-dashboard', { user: req.session.user, products: products, message: null });
                })
                .catch(err => {
                    res.status(500).send("Error fetching products");
                });
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

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Dashboard Routes
app.get('/buyer-dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'buyer') {
        return res.redirect('/');
    }
    res.render('buyer-dashboard', { user: req.session.user });
});

app.get('/seller-dashboard', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'seller') {
        return res.redirect('/');
    }

    // try {
    //     const requests = await Request.find({ sellerID: req.session.user.id });
    //     res.render('seller-dashboard', { user: req.session.user, requests });
    // } catch (err) {
    //     console.error(err);
    //     res.status(500).send('Error fetching requests');
    // }
});

//Add Product
app.post('/add-product', (req, res) => {
    const { name, description, price } = req.body;

    // Logic for saving the product to the database
    const newProduct = new Product({
        name,
        description,
        price
    });

    newProduct.save()
        .then(() => res.redirect('/seller-dashboard'))
        .catch((err) => res.status(500).send("Error adding product"));
});

//Smart-Buy
app.post('/smart-buy', async (req, res) => {
    const { productID, sellerID, productName, smartPrice } = req.body;

    if (!req.session.user || req.session.user.role !== 'buyer') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    // try {
    //     const newRequest = new Request({
    //         productName,
    //         buyerID: req.session.user.id,
    //         sellerID,
    //         smartPrice
    //     });

    //     await newRequest.save();
    //     res.json({ message: 'Smart Buy request submitted!' });
    // } catch (err) {
    //     console.error(err);
    //     res.status(500).json({ message: 'Error submitting Smart Buy request' });
    // }
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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
