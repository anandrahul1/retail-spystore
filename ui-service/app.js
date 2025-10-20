// Spy Gadgets Store - Main Application JavaScript

// Global application state
window.appState = {
    currentUser: null,
    cart: [],
    products: [],
    orders: [],
    currentSection: 'products',
    serviceStatus: {
        catalog: false,
        cart: false,
        orders: false,
        checkout: false,
        auth: false
    }
};

// API Configuration
const API_CONFIG = {
    baseUrl: window.location.origin,
    endpoints: {
        catalog: '/api/catalog',
        cart: '/api/cart',
        orders: '/api/orders',
        checkout: '/api/checkout',
        auth: '/api/auth'
    }
};

// Utility Functions
const utils = {
    formatPrice: (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    },

    formatDate: (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    showLoading: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('loading');
        }
    },

    hideLoading: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('loading');
        }
    },

    showError: (message, elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
        }
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// API Service
const apiService = {
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Catalog Service
    async getProducts() {
        try {
            return await this.request(`${API_CONFIG.baseUrl}/products`);
        } catch (error) {
            // Fallback to mock data if service is unavailable
            return this.getMockProducts();
        }
    },

    async getProduct(id) {
        try {
            return await this.request(`${API_CONFIG.baseUrl}/products/${id}`);
        } catch (error) {
            return this.getMockProducts().find(p => p.id === id);
        }
    },

    async searchProducts(query) {
        try {
            return await this.request(`${API_CONFIG.baseUrl}/search?q=${encodeURIComponent(query)}`);
        } catch (error) {
            const products = this.getMockProducts();
            return products.filter(p => 
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.description.toLowerCase().includes(query.toLowerCase())
            );
        }
    },

    // Cart Service
    async getCart(userId) {
        try {
            return await this.request(`${API_CONFIG.baseUrl}/cart/${userId}`);
        } catch (error) {
            return { items: [], total: 0 };
        }
    },

    async addToCart(userId, item) {
        try {
            return await this.request(`${API_CONFIG.baseUrl}/cart/${userId}/items`, {
                method: 'POST',
                body: JSON.stringify(item)
            });
        } catch (error) {
            // Add to local cart as fallback
            this.addToLocalCart(item);
            return { success: true };
        }
    },

    async updateCartItem(userId, itemId, quantity) {
        try {
            return await this.request(`${API_CONFIG.baseUrl}/cart/${userId}/items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity })
            });
        } catch (error) {
            this.updateLocalCartItem(itemId, quantity);
            return { success: true };
        }
    },

    async removeFromCart(userId, itemId) {
        try {
            return await this.request(`${API_CONFIG.baseUrl}/cart/${userId}/items/${itemId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            this.removeFromLocalCart(itemId);
            return { success: true };
        }
    },

    // Orders Service
    async getOrders(userId) {
        try {
            return await this.request(`${API_CONFIG.baseUrl}/orders/${userId}`);
        } catch (error) {
            return this.getMockOrders();
        }
    },

    async createOrder(userId, orderData) {
        try {
            return await this.request(`${API_CONFIG.baseUrl}/orders`, {
                method: 'POST',
                body: JSON.stringify({ userId, ...orderData })
            });
        } catch (error) {
            // Simulate order creation
            const orderId = 'ORDER-' + Date.now();
            return { success: true, orderId, message: 'Order created successfully!' };
        }
    },

    // Local storage fallbacks
    addToLocalCart(item) {
        const cart = JSON.parse(localStorage.getItem('spystore_cart') || '[]');
        const existingItem = cart.find(i => i.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += item.quantity || 1;
        } else {
            cart.push({ ...item, quantity: item.quantity || 1 });
        }
        
        localStorage.setItem('spystore_cart', JSON.stringify(cart));
        window.appState.cart = cart;
    },

    updateLocalCartItem(itemId, quantity) {
        const cart = JSON.parse(localStorage.getItem('spystore_cart') || '[]');
        const item = cart.find(i => i.id === itemId);
        
        if (item) {
            if (quantity <= 0) {
                this.removeFromLocalCart(itemId);
            } else {
                item.quantity = quantity;
                localStorage.setItem('spystore_cart', JSON.stringify(cart));
                window.appState.cart = cart;
            }
        }
    },

    removeFromLocalCart(itemId) {
        const cart = JSON.parse(localStorage.getItem('spystore_cart') || '[]');
        const filteredCart = cart.filter(i => i.id !== itemId);
        localStorage.setItem('spystore_cart', JSON.stringify(filteredCart));
        window.appState.cart = filteredCart;
    },

    getLocalCart() {
        return JSON.parse(localStorage.getItem('spystore_cart') || '[]');
    },

    // Mock data for fallback
    getMockProducts() {
        return [
            {
                id: 'spy-watch-001',
                name: 'Stealth Watch Pro',
                description: 'Advanced spy watch with hidden camera, GPS tracking, and encrypted communication.',
                price: 299.99,
                category: 'wearable',
                image: '⌚',
                features: ['Hidden Camera', 'GPS Tracking', 'Encrypted Comms', 'Water Resistant'],
                inStock: true
            },
            {
                id: 'micro-cam-002',
                name: 'Micro Button Camera',
                description: 'Ultra-small camera disguised as a button. Perfect for covert surveillance.',
                price: 89.99,
                category: 'surveillance',
                image: '📷',
                features: ['1080p Recording', 'Motion Detection', '8GB Storage', 'Long Battery'],
                inStock: true
            },
            {
                id: 'voice-pen-003',
                name: 'Voice Recording Pen',
                description: 'Professional recording pen with crystal clear audio and 32GB storage.',
                price: 149.99,
                category: 'audio',
                image: '🖊️',
                features: ['Crystal Clear Audio', '32GB Storage', 'Voice Activation', 'USB Charging'],
                inStock: true
            },
            {
                id: 'night-vision-004',
                name: 'Night Vision Glasses',
                description: 'Military-grade night vision with HD recording and infrared illumination.',
                price: 599.99,
                category: 'vision',
                image: '🥽',
                features: ['HD Night Vision', 'Infrared Illumination', 'Video Recording', 'Lightweight'],
                inStock: false
            },
            {
                id: 'gps-tracker-005',
                name: 'Nano GPS Tracker',
                description: 'World\'s smallest GPS tracker with real-time location and geofencing.',
                price: 199.99,
                category: 'tracking',
                image: '📍',
                features: ['Real-time Tracking', 'Geofencing', '30-day Battery', 'Waterproof'],
                inStock: true
            },
            {
                id: 'detector-006',
                name: 'Bug Detector Pro',
                description: 'Professional RF detector to find hidden cameras, microphones, and GPS trackers.',
                price: 399.99,
                category: 'detection',
                image: '📡',
                features: ['RF Detection', 'Camera Finder', 'Audio Alert', 'LED Display'],
                inStock: true
            }
        ];
    },

    getMockOrders() {
        return [
            {
                id: 'ORDER-001',
                date: '2024-01-15',
                status: 'completed',
                total: 449.98,
                items: [
                    { name: 'Stealth Watch Pro', quantity: 1, price: 299.99 },
                    { name: 'Micro Button Camera', quantity: 1, price: 149.99 }
                ]
            },
            {
                id: 'ORDER-002',
                date: '2024-01-10',
                status: 'processing',
                total: 199.99,
                items: [
                    { name: 'Nano GPS Tracker', quantity: 1, price: 199.99 }
                ]
            }
        ];
    }
};

// Section Management
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Add active class to corresponding nav button
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(sectionName)) {
            btn.classList.add('active');
        }
    });

    // Update app state
    window.appState.currentSection = sectionName;

    // Load section-specific data
    switch (sectionName) {
        case 'products':
            loadProducts();
            break;
        case 'cart':
            loadCart();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'checkout':
            loadCheckout();
            break;
    }
}

// Product Management
async function loadProducts() {
    const statusElement = document.getElementById('products-status');
    const listElement = document.getElementById('products-list');

    try {
        statusElement.textContent = 'Loading products...';
        utils.showLoading('products-list');

        const products = await apiService.getProducts();
        window.appState.products = products;

        if (products && products.length > 0) {
            displayProducts(products);
            statusElement.style.display = 'none';
        } else {
            statusElement.textContent = 'No products available at the moment.';
            listElement.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading products:', error);
        utils.showError('Failed to load products. Please try again.', 'products-status');
    } finally {
        utils.hideLoading('products-list');
    }
}

function displayProducts(products) {
    const listElement = document.getElementById('products-list');
    
    listElement.innerHTML = products.map(product => `
        <div class="product-card fade-in">
            <div class="product-image">${product.image || '📦'}</div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">${utils.formatPrice(product.price)}</div>
                <div class="product-features">
                    ${product.features ? product.features.slice(0, 2).map(feature => 
                        `<span class="feature-tag">✓ ${feature}</span>`
                    ).join('') : ''}
                </div>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="addToCart('${product.id}')" 
                            ${!product.inStock ? 'disabled' : ''}>
                        ${product.inStock ? '🛒 Add to Cart' : '❌ Out of Stock'}
                    </button>
                    <a href="product-details.html?id=${product.id}" class="btn-view-details">
                        👁️ Details
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

async function addToCart(productId) {
    try {
        const product = window.appState.products.find(p => p.id === productId);
        if (!product) {
            alert('Product not found!');
            return;
        }

        if (!product.inStock) {
            alert('This product is currently out of stock.');
            return;
        }

        const userId = window.authManager?.getCurrentUser()?.userId || 'anonymous';
        
        await apiService.addToCart(userId, {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });

        // Update cart count
        updateCartCount();
        
        // Show success message
        showNotification(`${product.name} added to cart!`, 'success');
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add item to cart. Please try again.', 'error');
    }
}