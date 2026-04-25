require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || 1;
const ENV = process.env.PHONEPE_ENV || 'UAT';
const CLIENT_URL = 'https://pickles-gilt.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://pickles-production-d378.up.railway.app';

const PHONEPE_HOST = ENV === 'PROD'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

// File-based Database Setup
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Initialize orders file if it doesn't exist
if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify({}, null, 2));
}

function saveOrder(transactionId, orderData) {
    try {
        const data = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
        data[transactionId] = {
            ...orderData,
            updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2));
        console.log(`Order ${transactionId} saved to storage.`);
    } catch (error) {
        console.error("Error saving order:", error.message);
    }
}

function getOrder(transactionId) {
    try {
        const data = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
        return data[transactionId];
    } catch (error) {
        return null;
    }
}

// Email Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use App Password for Gmail
    }
});

async function sendOrderEmail(order) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("Email credentials not set. Skipping email notification.");
        return;
    }

    const mailOptions = {
        from: `"Suravi Pickles" <${process.env.EMAIL_USER}>`,
        to: 'suravipickles@gmail.com',
        subject: `New Paid Order: ${order.name}`,
        html: `
            <h2>New Order Received!</h2>
            <p><strong>Customer:</strong> ${order.name}</p>
            <p><strong>Phone:</strong> ${order.phone}</p>
            <p><strong>Amount:</strong> ₹${order.amount / 100}</p>
            <p><strong>Address:</strong> ${order.address}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <br>
            <h3>Order Details:</h3>
            <pre>${order.orderInfo}</pre>
            <p><strong>Gift Message:</strong> ${order.giftMessage || 'None'}</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Order email sent to merchant.");
    } catch (error) {
        console.error("Error sending email:", error.message);
    }
}

app.post('/create-payment', async (req, res) => {
    try {
        const { amount, name, phone, address, giftMessage, orderInfo } = req.body;

        // Generate a unique transaction ID
        const transactionId = "TXN" + Date.now();

        // Store order details
        saveOrder(transactionId, {
            name,
            phone,
            amount,
            address,
            giftMessage,
            orderInfo,
            status: 'PENDING'
        });

        let validPhone = phone ? phone.toString().replace(/\D/g, '') : '';
        if (validPhone.length > 10) validPhone = validPhone.slice(-10);

        const payload = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: transactionId,
            merchantUserId: "MUID" + Date.now(),
            amount: Math.round(amount), // must be an integer in paise
            redirectUrl: `${BACKEND_URL}/payment-status/${transactionId}`,
            redirectMode: "REDIRECT",
            callbackUrl: `${BACKEND_URL}/api/callback`,
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        // PhonePe strictly expects exactly 10 digits
        if (validPhone.length === 10) {
            payload.mobileNumber = validPhone;
        }

        const payloadString = JSON.stringify(payload);
        const base64Payload = Buffer.from(payloadString).toString('base64');

        const endpoint = "/pg/v1/pay";
        const stringToSign = base64Payload + endpoint + SALT_KEY;
        const checksum = crypto.createHash('sha256').update(stringToSign).digest('hex') + "###" + SALT_INDEX;

        const response = await axios.post(`${PHONEPE_HOST}${endpoint}`, {
            request: base64Payload
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'accept': 'application/json'
            }
        });

        if (response.data.success) {
            const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
            res.json({ success: true, redirectUrl });
        } else {
            res.status(400).json({ success: false, message: response.data.message });
        }
    } catch (error) {
        const phonePeError = error.response?.data || error.message;
        console.error("Payment Creation Error:", phonePeError);
        res.status(500).json({
            success: false,
            message: "Payment Gateway Error: " + (phonePeError?.message || phonePeError || "Internal Server Error")
        });
    }
});

app.get('/payment-status/:transactionId', async (req, res) => {
    const { transactionId } = req.params;

    try {
        const endpoint = `/pg/v1/status/${MERCHANT_ID}/${transactionId}`;
        const stringToSign = endpoint + SALT_KEY;
        const checksum = crypto.createHash('sha256').update(stringToSign).digest('hex') + "###" + SALT_INDEX;

        const response = await axios.get(`${PHONEPE_HOST}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': MERCHANT_ID
            }
        });

        const status = response.data.data.state; // COMPLETED, FAILED, PENDING

        const order = getOrder(transactionId);
        if (order) {
            const oldStatus = order.status;
            order.status = status;
            saveOrder(transactionId, order);

            // If status just changed to COMPLETED, send email
            if (status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
                sendOrderEmail(order);
            }
        }

        if (status === 'COMPLETED') {
            res.redirect(`${CLIENT_URL}/payment-success?txnId=${transactionId}`);
        } else {
            res.redirect(`${CLIENT_URL}/failure?txnId=${transactionId}`);
        }
    } catch (error) {
        console.error("Status Check Error:", error.response?.data || error.message);
        res.redirect(`${CLIENT_URL}/failure.html?error=status_check_failed`);
    }
});

// Webhook for Server-to-Server callbacks
app.post('/api/callback', (req, res) => {
    try {
        if (!req.body.response) return res.status(400).send("No response body");
        const base64Response = req.body.response;
        const decodedResponse = Buffer.from(base64Response, 'base64').toString('utf-8');
        const responseObj = JSON.parse(decodedResponse);

        const transactionId = responseObj.data.merchantTransactionId;
        const state = responseObj.data.state;

        const order = getOrder(transactionId);
        if (order) {
            const oldStatus = order.status;
            order.status = state;
            saveOrder(transactionId, order);

            if (state === 'COMPLETED' && oldStatus !== 'COMPLETED') {
                sendOrderEmail(order);
            }
        }

        console.log(`PhonePe Callback received for ${transactionId}: ${state}`);
        res.status(200).send("OK");
    } catch (error) {
        console.error("Callback Error:", error.message);
        res.status(500).send("Error");
    }
});

app.get("/", (req, res) => {
    res.send("Backend working 🚀");
});

app.get("/pay", (req, res) => {
    const fakePaymentUrl = "pickles-gilt.vercel.app/payment-success";
    console.log("Firebase running");

    res.json({
        status: "success",
        paymentUrl: fakePaymentUrl
    });
});

app.listen(PORT, () => {
    console.log(`================================`);
    console.log(`Backend Server running on port ${PORT}`);
    console.log(`PhonePe Environment: ${ENV}`);
    console.log(`Frontend URL config: ${CLIENT_URL}`);
    console.log(`================================`);
});