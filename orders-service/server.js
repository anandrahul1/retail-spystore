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

// In-memory orders storage (in production, use DynamoDB)
let orders = {};
let ordersByUser = {};

// Order statuses
const ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'orders-service',
        totalOrders: Object.keys(orders).length
    });
});

// Create a new order
app.post('/orders', (req, res) => {
    try {
        const { 
            userId, 
            items, 
            totalAmount, 
            shippingAddress, 
            billingAddress, 
            paymentMethod 
        } = req.body;
        
        if (!userId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'User ID and items are required' });
        }
        
        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ error: 'Valid total amount is required' });
        }
        
        const orderId = uuidv4();
        const orderNumber = `SPY-${Date.now()}`;
        
        const newOrder = {
            id: orderId,
            orderNumber: orderNumber,
            userId: userId,
            items: items.map(item => ({
                id: uuidv4(),
                productId: item.productId,
                name: item.name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity),
                subtotal: parseFloat(item.price) * parseInt(item.quantity),
                image: item.image || null
            })),
            totalAmount: parseFloat(totalAmount),
            status: ORDER_STATUS.PENDING,
            shippingAddress: shippingAddress || null,
            billingAddress: billingAddress || null,
            paymentMethod: paymentMethod || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            trackingNumber: null
        };
        
        // Store order
        orders[orderId] = newOrder;
        
        // Index by user
        if (!ordersByUser[userId]) {
            ordersByUser[userId] = [];
        }
        ordersByUser[userId].push(orderId);
        
        // Simulate order confirmation after a short delay
        setTimeout(() => {
            if (orders[orderId]) {
                orders[orderId].status = ORDER_STATUS.CONFIRMED;
                orders[orderId].updatedAt = new Date().toISOString();
                orders[orderId].trackingNumber = `TRK${Date.now()}`;
            }
        }, 2000);
        
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: newOrder
        });
        
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Get order by ID
app.get('/orders/:orderId', (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = orders[orderId];
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
        
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Get orders for a user
app.get('/users/:userId/orders', (req, res) => {
    try {
        const { userId } = req.params;
        const { status, limit = 10, offset = 0 } = req.query;
        
        if (!ordersByUser[userId]) {
            return res.json({
                orders: [],
                total: 0,
                hasMore: false
            });
        }
        
        let userOrders = ordersByUser[userId].map(orderId => orders[orderId]).filter(Boolean);
        
        // Filter by status if provided
        if (status) {
            userOrders = userOrders.filter(order => order.status === status);
        }
        
        // Sort by creation date (newest first)
        userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Pagination
        const total = userOrders.length;
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedOrders = userOrders.slice(startIndex, endIndex);
        
        res.json({
            orders: paginatedOrders,
            total: total,
            hasMore: endIndex < total,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: total
            }
        });
        
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ error: 'Failed to fetch user orders' });
    }
});

// Update order status
app.put('/orders/:orderId/status', (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, trackingNumber } = req.body;
        
        if (!Object.values(ORDER_STATUS).includes(status)) {
            return res.status(400).json({ error: 'Invalid order status' });
        }
        
        const order = orders[orderId];
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        order.status = status;
        order.updatedAt = new Date().toISOString();
        
        if (trackingNumber) {
            order.trackingNumber = trackingNumber;
        }
        
        // Update estimated delivery for shipped orders
        if (status === ORDER_STATUS.SHIPPED && !order.estimatedDelivery) {
            order.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days
        }
        
        res.json({
            success: true,
            message: 'Order status updated',
            order: order
        });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Cancel order
app.post('/orders/:orderId/cancel', (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        
        const order = orders[orderId];
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Only allow cancellation for pending or confirmed orders
        if (![ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(order.status)) {
            return res.status(400).json({ 
                error: 'Order cannot be cancelled in current status',
                currentStatus: order.status
            });
        }
        
        order.status = ORDER_STATUS.CANCELLED;
        order.updatedAt = new Date().toISOString();
        order.cancellationReason = reason || 'Cancelled by customer';
        order.cancelledAt = new Date().toISOString();
        
        res.json({
            success: true,
            message: 'Order cancelled successfully',
            order: order
        });
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

// Get order tracking information
app.get('/orders/:orderId/tracking', (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = orders[orderId];
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Simulate tracking events
        const trackingEvents = [];
        const createdDate = new Date(order.createdAt);
        
        trackingEvents.push({
            status: 'Order Placed',
            description: 'Your spy gadget order has been received',
            timestamp: order.createdAt,
            location: 'Online'
        });
        
        if (order.status !== ORDER_STATUS.PENDING) {
            trackingEvents.push({
                status: 'Order Confirmed',
                description: 'Order confirmed and being prepared',
                timestamp: new Date(createdDate.getTime() + 2000).toISOString(),
                location: 'Warehouse'
            });
        }
        
        if ([ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].includes(order.status)) {
            trackingEvents.push({
                status: 'Processing',
                description: 'Items are being picked and packed',
                timestamp: new Date(createdDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                location: 'Fulfillment Center'
            });
        }
        
        if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].includes(order.status)) {
            trackingEvents.push({
                status: 'Shipped',
                description: 'Package is on its way',
                timestamp: new Date(createdDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                location: 'In Transit'
            });
        }
        
        if (order.status === ORDER_STATUS.DELIVERED) {
            trackingEvents.push({
                status: 'Delivered',
                description: 'Package delivered successfully',
                timestamp: new Date(createdDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                location: 'Destination'
            });
        }
        
        res.json({
            orderId: orderId,
            orderNumber: order.orderNumber,
            currentStatus: order.status,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery,
            trackingEvents: trackingEvents.reverse() // Most recent first
        });
        
    } catch (error) {
        console.error('Error fetching tracking info:', error);
        res.status(500).json({ error: 'Failed to fetch tracking information' });
    }
});

// Get order statistics
app.get('/orders/stats/summary', (req, res) => {
    try {
        const allOrders = Object.values(orders);
        
        const stats = {
            totalOrders: allOrders.length,
            totalRevenue: allOrders.reduce((sum, order) => sum + order.totalAmount, 0),
            ordersByStatus: {},
            averageOrderValue: 0,
            topProducts: {}
        };
        
        // Count orders by status
        Object.values(ORDER_STATUS).forEach(status => {
            stats.ordersByStatus[status] = allOrders.filter(order => order.status === status).length;
        });
        
        // Calculate average order value
        if (allOrders.length > 0) {
            stats.averageOrderValue = stats.totalRevenue / allOrders.length;
        }
        
        // Count top products
        allOrders.forEach(order => {
            order.items.forEach(item => {
                if (!stats.topProducts[item.name]) {
                    stats.topProducts[item.name] = 0;
                }
                stats.topProducts[item.name] += item.quantity;
            });
        });
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ error: 'Failed to fetch order statistics' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`📦 Orders service listening on port ${port}`);
    console.log('🌐 CORS enabled for all origins');
    console.log('✅ Orders service ready!');
});