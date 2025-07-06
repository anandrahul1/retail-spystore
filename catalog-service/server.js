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

// Sample spy gadget products
const products = [
    {
        id: uuidv4(),
        name: "Hidden Camera Pen",
        price: 89.99,
        category: "surveillance",
        description: "Professional spy pen with HD recording capability. Perfect for discrete surveillance and evidence gathering. Features 1080p video recording, 8GB internal storage, and up to 2 hours of continuous recording.",
        image: "/images/spy-pen.jpg",
        inStock: true,
        stockCount: 25,
        features: ["1080p HD Recording", "8GB Storage", "2 Hour Battery", "Discrete Design"],
        specifications: {
            resolution: "1920x1080",
            storage: "8GB",
            battery: "2 hours",
            dimensions: "14cm x 1.2cm"
        }
    },
    {
        id: uuidv4(),
        name: "Wireless Spy Camera",
        price: 129.99,
        category: "surveillance",
        description: "Compact wireless camera with night vision and motion detection. Stream live video to your smartphone from anywhere. Perfect for home security and covert operations.",
        image: "/images/wireless-camera.jpg",
        inStock: true,
        stockCount: 18,
        features: ["Night Vision", "Motion Detection", "WiFi Streaming", "Mobile App"],
        specifications: {
            resolution: "1920x1080",
            nightVision: "10 meters",
            connectivity: "WiFi 802.11n",
            battery: "6 hours"
        }
    },
    {
        id: uuidv4(),
        name: "Button Camera",
        price: 59.99,
        category: "surveillance",
        description: "Ultra-small button camera for discrete recording. Easily attaches to clothing and records high-quality video without detection. Perfect for undercover operations.",
        image: "/images/button-camera.jpg",
        inStock: true,
        stockCount: 32,
        features: ["Ultra Compact", "Easy Attachment", "HD Recording", "Long Battery"],
        specifications: {
            resolution: "1280x720",
            size: "2cm diameter",
            battery: "3 hours",
            storage: "4GB"
        }
    },
    {
        id: uuidv4(),
        name: "Spy Watch with Camera",
        price: 199.99,
        category: "wearable",
        description: "Multi-function spy watch with built-in camera, voice recorder, and GPS tracking. Looks like a regular watch but packed with surveillance features.",
        image: "/images/spy-watch.jpg",
        inStock: true,
        stockCount: 12,
        features: ["Built-in Camera", "Voice Recording", "GPS Tracking", "Water Resistant"],
        specifications: {
            resolution: "1920x1080",
            storage: "16GB",
            battery: "4 hours recording",
            waterRating: "IP65"
        }
    },
    {
        id: uuidv4(),
        name: "Audio Bug Detector",
        price: 149.99,
        category: "detection",
        description: "Professional RF detector to find hidden cameras, microphones, and GPS trackers. Essential for counter-surveillance and privacy protection.",
        image: "/images/bug-detector.jpg",
        inStock: true,
        stockCount: 8,
        features: ["RF Detection", "Camera Finder", "GPS Tracker Detection", "Audio Alert"],
        specifications: {
            frequency: "1MHz-6.5GHz",
            sensitivity: "High",
            battery: "8 hours",
            range: "10 meters"
        }
    },
    {
        id: uuidv4(),
        name: "Voice Recorder Keychain",
        price: 39.99,
        category: "audio",
        description: "Discrete voice recorder disguised as a regular keychain. Crystal clear audio recording with noise reduction technology.",
        image: "/images/voice-recorder.jpg",
        inStock: true,
        stockCount: 45,
        features: ["Noise Reduction", "Long Recording Time", "Discrete Design", "Easy Transfer"],
        specifications: {
            recordingTime: "20 hours",
            storage: "8GB",
            battery: "15 hours",
            format: "MP3"
        }
    },
    {
        id: uuidv4(),
        name: "Night Vision Goggles",
        price: 299.99,
        category: "vision",
        description: "Professional night vision goggles for covert operations in complete darkness. Digital infrared technology with recording capability.",
        image: "/images/night-vision.jpg",
        inStock: true,
        stockCount: 6,
        features: ["Digital IR", "Video Recording", "Photo Capture", "Adjustable Straps"],
        specifications: {
            range: "200 meters",
            magnification: "4x",
            battery: "6 hours",
            storage: "32GB"
        }
    },
    {
        id: uuidv4(),
        name: "GPS Tracker",
        price: 79.99,
        category: "tracking",
        description: "Real-time GPS tracker with long battery life. Track vehicles, assets, or people with precision location data and geofencing alerts.",
        image: "/images/gps-tracker.jpg",
        inStock: true,
        stockCount: 28,
        features: ["Real-time Tracking", "Geofencing", "Long Battery", "Mobile App"],
        specifications: {
            accuracy: "3 meters",
            battery: "30 days",
            updateInterval: "10 seconds",
            connectivity: "4G LTE"
        }
    }
];

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'catalog-service',
        productsCount: products.length
    });
});

// Get all products
app.get('/products', (req, res) => {
    try {
        const { category, minPrice, maxPrice, inStock, search } = req.query;
        let filteredProducts = [...products];

        // Filter by category
        if (category) {
            filteredProducts = filteredProducts.filter(p => 
                p.category.toLowerCase() === category.toLowerCase()
            );
        }

        // Filter by price range
        if (minPrice) {
            filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
        }
        if (maxPrice) {
            filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
        }

        // Filter by stock status
        if (inStock === 'true') {
            filteredProducts = filteredProducts.filter(p => p.inStock && p.stockCount > 0);
        }

        // Search in name and description
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm) ||
                p.features.some(f => f.toLowerCase().includes(searchTerm))
            );
        }

        res.json(filteredProducts);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get product by ID
app.get('/products/:id', (req, res) => {
    try {
        const { id } = req.params;
        const product = products.find(p => p.id === id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Get product categories
app.get('/categories', (req, res) => {
    try {
        const categories = [...new Set(products.map(p => p.category))];
        const categoryData = categories.map(category => ({
            name: category,
            count: products.filter(p => p.category === category).length,
            displayName: category.charAt(0).toUpperCase() + category.slice(1)
        }));
        
        res.json(categoryData);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Search products
app.get('/search', (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const searchTerm = q.toLowerCase();
        const searchResults = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm) ||
            p.features.some(f => f.toLowerCase().includes(searchTerm))
        ).slice(0, parseInt(limit));
        
        res.json({
            query: q,
            results: searchResults,
            totalFound: searchResults.length
        });
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Failed to search products' });
    }
});

// Get featured/popular products
app.get('/featured', (req, res) => {
    try {
        // Return products with highest stock count as "popular"
        const featured = products
            .sort((a, b) => b.stockCount - a.stockCount)
            .slice(0, 4);
        
        res.json(featured);
    } catch (error) {
        console.error('Error fetching featured products:', error);
        res.status(500).json({ error: 'Failed to fetch featured products' });
    }
});

// Check product availability
app.get('/products/:id/availability', (req, res) => {
    try {
        const { id } = req.params;
        const product = products.find(p => p.id === id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({
            productId: id,
            inStock: product.inStock,
            stockCount: product.stockCount,
            available: product.inStock && product.stockCount > 0
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`🛍️ Catalog service listening on port ${port}`);
    console.log(`📦 Managing ${products.length} spy gadget products`);
    console.log('🌐 CORS enabled for all origins');
    console.log('✅ Catalog service ready!');
});