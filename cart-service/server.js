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

// In-memory cart storage (in production, use Redis or DynamoDB)
let carts = {};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'cart-service',
        activeCarts: Object.keys(carts).length
    });
});

// Get cart for user
app.get('/cart/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!carts[userId]) {
            carts[userId] = {
                userId: userId,
                items: [],
                totalItems: 0,
                totalPrice: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
        
        res.json(carts[userId]);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// Add item to cart
app.post('/cart/:userId/items', (req, res) => {
    try {
        const { userId } = req.params;
        const { productId, name, price, quantity = 1, image } = req.body;
        
        if (!productId || !name || !price) {
            return res.status(400).json({ error: 'Product ID, name, and price are required' });
        }
        
        // Initialize cart if it doesn't exist
        if (!carts[userId]) {
            carts[userId] = {
                userId: userId,
                items: [],
                totalItems: 0,
                totalPrice: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
        
        const cart = carts[userId];
        
        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
        
        if (existingItemIndex >= 0) {
            // Update quantity of existing item
            cart.items[existingItemIndex].quantity += quantity;
            cart.items[existingItemIndex].subtotal = cart.items[existingItemIndex].quantity * cart.items[existingItemIndex].price;
        } else {
            // Add new item to cart
            const newItem = {
                id: uuidv4(),
                productId: productId,
                name: name,
                price: parseFloat(price),
                quantity: quantity,
                subtotal: parseFloat(price) * quantity,
                image: image || null,
                addedAt: new Date().toISOString()
            };
            cart.items.push(newItem);
        }
        
        // Recalculate totals
        cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        cart.updatedAt = new Date().toISOString();
        
        res.json({
            success: true,
            message: 'Item added to cart',
            cart: cart
        });
        
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// Update item quantity in cart
app.put('/cart/:userId/items/:itemId', (req, res) => {
    try {
        const { userId, itemId } = req.params;
        const { quantity } = req.body;
        
        if (!quantity || quantity < 0) {
            return res.status(400).json({ error: 'Valid quantity is required' });
        }
        
        if (!carts[userId]) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        const cart = carts[userId];
        const itemIndex = cart.items.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }
        
        if (quantity === 0) {
            // Remove item if quantity is 0
            cart.items.splice(itemIndex, 1);
        } else {
            // Update quantity
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].subtotal = cart.items[itemIndex].price * quantity;
        }
        
        // Recalculate totals
        cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        cart.updatedAt = new Date().toISOString();
        
        res.json({
            success: true,
            message: 'Cart updated',
            cart: cart
        });
        
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ error: 'Failed to update cart item' });
    }
});

// Remove item from cart
app.delete('/cart/:userId/items/:itemId', (req, res) => {
    try {
        const { userId, itemId } = req.params;
        
        if (!carts[userId]) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        const cart = carts[userId];
        const itemIndex = cart.items.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }
        
        // Remove item
        const removedItem = cart.items.splice(itemIndex, 1)[0];
        
        // Recalculate totals
        cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
        cart.updatedAt = new Date().toISOString();
        
        res.json({
            success: true,
            message: 'Item removed from cart',
            removedItem: removedItem,
            cart: cart
        });
        
    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ error: 'Failed to remove cart item' });
    }
});

// Clear entire cart
app.delete('/cart/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!carts[userId]) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        // Clear cart but keep the structure
        carts[userId] = {
            userId: userId,
            items: [],
            totalItems: 0,
            totalPrice: 0,
            createdAt: carts[userId].createdAt,
            updatedAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            message: 'Cart cleared',
            cart: carts[userId]
        });
        
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

// Get cart summary
app.get('/cart/:userId/summary', (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!carts[userId]) {
            return res.json({
                userId: userId,
                totalItems: 0,
                totalPrice: 0,
                isEmpty: true
            });
        }
        
        const cart = carts[userId];
        
        res.json({
            userId: userId,
            totalItems: cart.totalItems,
            totalPrice: cart.totalPrice,
            itemCount: cart.items.length,
            isEmpty: cart.items.length === 0,
            lastUpdated: cart.updatedAt
        });
        
    } catch (error) {
        console.error('Error fetching cart summary:', error);
        res.status(500).json({ error: 'Failed to fetch cart summary' });
    }
});

// Validate cart (check if all items are still available)
app.post('/cart/:userId/validate', (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!carts[userId]) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        const cart = carts[userId];
        
        // In a real implementation, you would check with the catalog service
        // to verify product availability and current prices
        
        const validation = {
            isValid: true,
            issues: [],
            cart: cart
        };
        
        // Simulate some validation checks
        cart.items.forEach(item => {
            // Example: Check if price has changed (simulated)
            if (Math.random() < 0.1) { // 10% chance of price change
                validation.issues.push({
                    itemId: item.id,
                    productId: item.productId,
                    type: 'price_change',
                    message: `Price for ${item.name} has changed`,
                    oldPrice: item.price,
                    newPrice: item.price * 1.05 // 5% increase
                });
                validation.isValid = false;
            }
        });
        
        res.json(validation);
        
    } catch (error) {
        console.error('Error validating cart:', error);
        res.status(500).json({ error: 'Failed to validate cart' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`🛒 Cart service listening on port ${port}`);
    console.log('🌐 CORS enabled for all origins');
    console.log('✅ Cart service ready!');
});