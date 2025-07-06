const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 80;

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['DNT', 'User-Agent', 'X-Requested-With', 'If-Modified-Since', 'Cache-Control', 'Content-Type', 'Range', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// In-memory payment sessions storage (in production, use secure storage)
let paymentSessions = {};
let transactions = {};

// Payment methods
const PAYMENT_METHODS = {
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    PAYPAL: 'paypal',
    APPLE_PAY: 'apple_pay',
    GOOGLE_PAY: 'google_pay'
};

// Transaction statuses
const TRANSACTION_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'checkout-service',
        activePaymentSessions: Object.keys(paymentSessions).length,
        totalTransactions: Object.keys(transactions).length
    });
});

// Initialize checkout session
app.post('/checkout/session', (req, res) => {
    try {
        const { 
            userId, 
            items, 
            totalAmount, 
            currency = 'USD',
            shippingAddress,
            billingAddress 
        } = req.body;
        
        if (!userId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'User ID and items are required' });
        }
        
        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ error: 'Valid total amount is required' });
        }
        
        const sessionId = uuidv4();
        
        // Calculate tax and shipping (simulated)
        const subtotal = parseFloat(totalAmount);
        const taxRate = 0.08; // 8% tax
        const tax = subtotal * taxRate;
        const shipping = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
        const total = subtotal + tax + shipping;
        
        const session = {
            id: sessionId,
            userId: userId,
            items: items.map(item => ({
                productId: item.productId,
                name: item.name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity),
                subtotal: parseFloat(item.price) * parseInt(item.quantity)
            })),
            pricing: {
                subtotal: subtotal,
                tax: tax,
                shipping: shipping,
                total: total,
                currency: currency
            },
            shippingAddress: shippingAddress || null,
            billingAddress: billingAddress || null,
            status: 'initialized',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
            paymentMethod: null,
            transactionId: null
        };
        
        paymentSessions[sessionId] = session;
        
        res.status(201).json({
            success: true,
            message: 'Checkout session created',
            session: session
        });
        
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Get checkout session
app.get('/checkout/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const session = paymentSessions[sessionId];
        if (!session) {
            return res.status(404).json({ error: 'Checkout session not found' });
        }
        
        // Check if session has expired
        if (new Date() > new Date(session.expiresAt)) {
            session.status = 'expired';
        }
        
        res.json(session);
        
    } catch (error) {
        console.error('Error fetching checkout session:', error);
        res.status(500).json({ error: 'Failed to fetch checkout session' });
    }
});

// Process payment
app.post('/checkout/payment', (req, res) => {
    try {
        const { 
            sessionId, 
            paymentMethod, 
            paymentDetails,
            billingAddress 
        } = req.body;
        
        if (!sessionId || !paymentMethod) {
            return res.status(400).json({ error: 'Session ID and payment method are required' });
        }
        
        const session = paymentSessions[sessionId];
        if (!session) {
            return res.status(404).json({ error: 'Checkout session not found' });
        }
        
        // Check if session has expired
        if (new Date() > new Date(session.expiresAt)) {
            return res.status(400).json({ error: 'Checkout session has expired' });
        }
        
        if (session.status !== 'initialized') {
            return res.status(400).json({ error: 'Session is not in a valid state for payment' });
        }
        
        // Validate payment method
        if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
            return res.status(400).json({ error: 'Invalid payment method' });
        }
        
        const transactionId = uuidv4();
        
        // Create transaction record
        const transaction = {
            id: transactionId,
            sessionId: sessionId,
            userId: session.userId,
            amount: session.pricing.total,
            currency: session.pricing.currency,
            paymentMethod: paymentMethod,
            paymentDetails: {
                // In production, never store sensitive payment details
                type: paymentMethod,
                last4: paymentDetails?.cardNumber ? paymentDetails.cardNumber.slice(-4) : null,
                brand: paymentDetails?.brand || null
            },
            billingAddress: billingAddress || session.billingAddress,
            status: TRANSACTION_STATUS.PROCESSING,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        transactions[transactionId] = transaction;
        
        // Update session
        session.paymentMethod = paymentMethod;
        session.transactionId = transactionId;
        session.status = 'processing';
        session.billingAddress = billingAddress || session.billingAddress;
        
        // Simulate payment processing delay
        setTimeout(() => {
            // Simulate payment success/failure (90% success rate)
            const isSuccess = Math.random() > 0.1;
            
            if (isSuccess) {
                transaction.status = TRANSACTION_STATUS.COMPLETED;
                transaction.completedAt = new Date().toISOString();
                transaction.authorizationCode = `AUTH${Date.now()}`;
                session.status = 'completed';
            } else {
                transaction.status = TRANSACTION_STATUS.FAILED;
                transaction.failureReason = 'Payment declined by issuer';
                session.status = 'failed';
            }
            
            transaction.updatedAt = new Date().toISOString();
        }, 2000);
        
        res.json({
            success: true,
            message: 'Payment processing initiated',
            transactionId: transactionId,
            status: TRANSACTION_STATUS.PROCESSING,
            session: session
        });
        
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: 'Failed to process payment' });
    }
});

// Get payment status
app.get('/checkout/payment/:transactionId/status', (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const transaction = transactions[transactionId];
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        res.json({
            transactionId: transactionId,
            status: transaction.status,
            amount: transaction.amount,
            currency: transaction.currency,
            paymentMethod: transaction.paymentMethod,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            completedAt: transaction.completedAt || null,
            authorizationCode: transaction.authorizationCode || null,
            failureReason: transaction.failureReason || null
        });
        
    } catch (error) {
        console.error('Error fetching payment status:', error);
        res.status(500).json({ error: 'Failed to fetch payment status' });
    }
});

// Refund payment
app.post('/checkout/payment/:transactionId/refund', (req, res) => {
    try {
        const { transactionId } = req.params;
        const { amount, reason } = req.body;
        
        const transaction = transactions[transactionId];
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        if (transaction.status !== TRANSACTION_STATUS.COMPLETED) {
            return res.status(400).json({ error: 'Only completed transactions can be refunded' });
        }
        
        const refundAmount = amount || transaction.amount;
        
        if (refundAmount > transaction.amount) {
            return res.status(400).json({ error: 'Refund amount cannot exceed transaction amount' });
        }
        
        const refundId = uuidv4();
        
        // Create refund record
        const refund = {
            id: refundId,
            transactionId: transactionId,
            amount: refundAmount,
            currency: transaction.currency,
            reason: reason || 'Customer request',
            status: 'processing',
            createdAt: new Date().toISOString()
        };
        
        // Update transaction
        transaction.status = TRANSACTION_STATUS.REFUNDED;
        transaction.refundId = refundId;
        transaction.refundAmount = refundAmount;
        transaction.updatedAt = new Date().toISOString();
        
        // Simulate refund processing
        setTimeout(() => {
            refund.status = 'completed';
            refund.completedAt = new Date().toISOString();
        }, 1000);
        
        res.json({
            success: true,
            message: 'Refund initiated',
            refund: refund,
            transaction: transaction
        });
        
    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({ error: 'Failed to process refund' });
    }
});

// Get supported payment methods
app.get('/checkout/payment-methods', (req, res) => {
    try {
        const supportedMethods = [
            {
                type: PAYMENT_METHODS.CREDIT_CARD,
                name: 'Credit Card',
                description: 'Visa, MasterCard, American Express',
                enabled: true,
                fees: {
                    percentage: 2.9,
                    fixed: 0.30
                }
            },
            {
                type: PAYMENT_METHODS.DEBIT_CARD,
                name: 'Debit Card',
                description: 'Bank debit cards',
                enabled: true,
                fees: {
                    percentage: 1.9,
                    fixed: 0.30
                }
            },
            {
                type: PAYMENT_METHODS.PAYPAL,
                name: 'PayPal',
                description: 'Pay with your PayPal account',
                enabled: true,
                fees: {
                    percentage: 3.49,
                    fixed: 0.49
                }
            },
            {
                type: PAYMENT_METHODS.APPLE_PAY,
                name: 'Apple Pay',
                description: 'Pay with Touch ID or Face ID',
                enabled: true,
                fees: {
                    percentage: 2.9,
                    fixed: 0.30
                }
            },
            {
                type: PAYMENT_METHODS.GOOGLE_PAY,
                name: 'Google Pay',
                description: 'Pay with Google Pay',
                enabled: true,
                fees: {
                    percentage: 2.9,
                    fixed: 0.30
                }
            }
        ];
        
        res.json({
            paymentMethods: supportedMethods,
            defaultMethod: PAYMENT_METHODS.CREDIT_CARD
        });
        
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
});

// Calculate shipping rates
app.post('/checkout/shipping', (req, res) => {
    try {
        const { items, shippingAddress, totalWeight } = req.body;
        
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Items are required' });
        }
        
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Simulate shipping options
        const shippingOptions = [
            {
                id: 'standard',
                name: 'Standard Shipping',
                description: '5-7 business days',
                price: subtotal > 100 ? 0 : 9.99,
                estimatedDays: 7,
                carrier: 'USPS'
            },
            {
                id: 'expedited',
                name: 'Expedited Shipping',
                description: '2-3 business days',
                price: subtotal > 200 ? 9.99 : 19.99,
                estimatedDays: 3,
                carrier: 'UPS'
            },
            {
                id: 'overnight',
                name: 'Overnight Shipping',
                description: 'Next business day',
                price: 29.99,
                estimatedDays: 1,
                carrier: 'FedEx'
            }
        ];
        
        res.json({
            shippingOptions: shippingOptions,
            freeShippingThreshold: 100,
            expeditedFreeThreshold: 200
        });
        
    } catch (error) {
        console.error('Error calculating shipping:', error);
        res.status(500).json({ error: 'Failed to calculate shipping rates' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`💳 Checkout service listening on port ${port}`);
    console.log('🌐 CORS enabled for all origins');
    console.log('✅ Checkout service ready!');
});