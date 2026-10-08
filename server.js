const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Database
const users = {}; 
const otps = {};  
const transactions = []; 

// 1. Send OTP for Registration
app.post('/api/auth/send-otp', (req, res) => {
    const { mobile } = req.body;
    if (!mobile || mobile.length !== 10) {
        return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    }
    const generatedOtp = "1234"; 
    otps[mobile] = generatedOtp;
    res.json({ message: 'OTP sent successfully', demoOtp: generatedOtp });
});

// 2. Register Account
app.post('/api/auth/register', (req, res) => {
    const { mobile, otp, password, name } = req.body;

    if (!otps[mobile] || otps[mobile] !== otp) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (users[mobile]) {
        return res.status(400).json({ error: 'Mobile number already registered' });
    }

    const vpa = `${mobile}@fm`;
    
    users[mobile] = {
        name: name || `User ${mobile.slice(-4)}`,
        mobile,
        vpa,
        password,
        balance: 11000.00
    };

    delete otps[mobile];

    res.json({ 
        message: 'Account created successfully', 
        user: { name: users[mobile].name, mobile: users[mobile].mobile, vpa: users[mobile].vpa } 
    });
});

// 3. Login User
app.post('/api/auth/login', (req, res) => {
    const { mobile, password } = req.body;

    const user = users[mobile];
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid mobile number or password' });
    }

    res.json({
        message: 'Login successful',
        user: {
            name: user.name,
            mobile: user.mobile,
            vpa: user.vpa
        }
    });
});

// 4. Secure Check Balance (Requires Password)
// Secure Check Balance (Requires Password)
app.post('/api/user/check-balance', (req, res) => {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
        return res.status(400).json({ error: 'Mobile and password are required' });
    }

    const cleanMobile = String(mobile).trim();
    const cleanPassword = String(password).trim();

    const user = users[cleanMobile];

    if (!user) {
        return res.status(404).json({ error: 'Session expired or user not found. Please log in again.' });
    }

    if (String(user.password).trim() !== cleanPassword) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    res.json({ balance: user.balance });
});

// 5. Transfer Money
app.post('/api/pay', (req, res) => {
    const { senderMobile, recipientIdentifier, amount } = req.body;
    const transferAmount = parseFloat(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({ error: 'Invalid transaction amount' });
    }

    const sender = users[senderMobile];
    if (!sender) return res.status(404).json({ error: 'Sender account not found' });

    if (sender.balance < transferAmount) {
        return res.status(400).json({ error: 'Insufficient funds' });
    }

    let recipientKey = Object.keys(users).find(key => {
        const u = users[key];
        return u.mobile === recipientIdentifier || u.vpa.toLowerCase() === recipientIdentifier.toLowerCase();
    });

    if (!recipientKey) {
        return res.status(404).json({ error: 'Recipient handle or phone number not found in FULL MOON network' });
    }

    const recipient = users[recipientKey];

    if (sender.mobile === recipient.mobile) {
        return res.status(400).json({ error: 'Cannot transfer money to yourself' });
    }

    sender.balance -= transferAmount;
    recipient.balance += transferAmount;

    const txRecord = {
        id: 'FM' + Math.floor(100000000 + Math.random() * 900000000),
        senderMobile: sender.mobile,
        senderVpa: sender.vpa,
        senderName: sender.name,
        recipientMobile: recipient.mobile,
        recipientVpa: recipient.vpa,
        recipientName: recipient.name,
        amount: transferAmount,
        timestamp: new Date().toLocaleString()
    };

    transactions.push(txRecord);

    res.json({
        message: 'Payment Successful',
        transaction: txRecord
    });
});

// 6. Get User Transaction History
app.get('/api/transactions/:mobile', (req, res) => {
    const mobile = req.params.mobile;
    const userTx = transactions.filter(
        tx => tx.senderMobile === mobile || tx.recipientMobile === mobile
    );
    res.json(userTx.reverse());
});

const PORT = process.env.PORT || 1001;
app.listen(PORT, () => {
    console.log(`FULL MOON Server active on http://localhost:${PORT}`);
});