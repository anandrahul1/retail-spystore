const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 80;

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'spy-gadgets-secret-key-2024';
const JWT_EXPIRES_IN = '24h';

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['DNT', 'User-Agent', 'X-Requested-With', 'If-Modified-Since', 'Cache-Control', 'Content-Type', 'Range', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// In-memory user storage (in production, use database)
let users = {};
let refreshTokens = {};

// User roles
const USER_ROLES = {
    CUSTOMER: 'customer',
    ADMIN: 'admin',
    MODERATOR: 'moderator'
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'auth-service',
        totalUsers: Object.keys(users).length,
        activeTokens: Object.keys(refreshTokens).length
    });
});

// Register new user
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;
        
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
        }
        
        // Check if user already exists
        const existingUser = Object.values(users).find(user => user.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        
        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const userId = uuidv4();
        
        // Create user
        const newUser = {
            id: userId,
            email: email.toLowerCase(),
            password: hashedPassword,
            firstName: firstName,
            lastName: lastName,
            phone: phone || null,
            role: USER_ROLES.CUSTOMER,
            isActive: true,
            isEmailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: null,
            profile: {
                preferences: {},
                addresses: []
            }
        };
        
        users[userId] = newUser;
        
        // Generate tokens
        const accessToken = jwt.sign(
            { 
                userId: userId, 
                email: email.toLowerCase(), 
                role: USER_ROLES.CUSTOMER 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        const refreshToken = uuidv4();
        refreshTokens[refreshToken] = {
            userId: userId,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        };
        
        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = newUser;
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userWithoutPassword,
            tokens: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                expiresIn: JWT_EXPIRES_IN
            }
        });
        
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login user
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const user = Object.values(users).find(user => user.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Update last login
        user.lastLoginAt = new Date().toISOString();
        user.updatedAt = new Date().toISOString();
        
        // Generate tokens
        const accessToken = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        const refreshToken = uuidv4();
        refreshTokens[refreshToken] = {
            userId: user.id,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        };
        
        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            message: 'Login successful',
            user: userWithoutPassword,
            tokens: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                expiresIn: JWT_EXPIRES_IN
            }
        });
        
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Refresh access token
app.post('/auth/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }
        
        const tokenData = refreshTokens[refreshToken];
        if (!tokenData) {
            return res.status(403).json({ error: 'Invalid refresh token' });
        }
        
        // Check if refresh token has expired
        if (new Date() > new Date(tokenData.expiresAt)) {
            delete refreshTokens[refreshToken];
            return res.status(403).json({ error: 'Refresh token has expired' });
        }
        
        const user = users[tokenData.userId];
        if (!user || !user.isActive) {
            delete refreshTokens[refreshToken];
            return res.status(403).json({ error: 'User not found or inactive' });
        }
        
        // Generate new access token
        const accessToken = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        res.json({
            success: true,
            tokens: {
                accessToken: accessToken,
                refreshToken: refreshToken, // Keep the same refresh token
                expiresIn: JWT_EXPIRES_IN
            }
        });
        
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// Logout user
app.post('/auth/logout', authenticateToken, (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        // Remove refresh token if provided
        if (refreshToken && refreshTokens[refreshToken]) {
            delete refreshTokens[refreshToken];
        }
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
        
    } catch (error) {
        console.error('Error logging out user:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Get current user profile
app.get('/auth/profile', authenticateToken, (req, res) => {
    try {
        const user = users[req.user.userId];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Update user profile
app.put('/auth/profile', authenticateToken, (req, res) => {
    try {
        const { firstName, lastName, phone, preferences } = req.body;
        
        const user = users[req.user.userId];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update user data
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone !== undefined) user.phone = phone;
        if (preferences) user.profile.preferences = { ...user.profile.preferences, ...preferences };
        
        user.updatedAt = new Date().toISOString();
        
        // Return updated user data (without password)
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
app.put('/auth/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        const user = users[req.user.userId];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Validate new password
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }
        
        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        user.password = hashedNewPassword;
        user.updatedAt = new Date().toISOString();
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Verify token (for other services)
app.post('/auth/verify', (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ 
                    valid: false, 
                    error: 'Invalid or expired token' 
                });
            }
            
            const user = users[decoded.userId];
            if (!user || !user.isActive) {
                return res.status(403).json({ 
                    valid: false, 
                    error: 'User not found or inactive' 
                });
            }
            
            res.json({
                valid: true,
                user: {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role
                }
            });
        });
        
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
});

// Get user by ID (for other services)
app.get('/auth/users/:userId', authenticateToken, (req, res) => {
    try {
        const { userId } = req.params;
        
        // Only allow users to access their own data or admins to access any data
        if (req.user.userId !== userId && req.user.role !== USER_ROLES.ADMIN) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const user = users[userId];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`🔐 Auth service listening on port ${port}`);
    console.log('🌐 CORS enabled for all origins');
    console.log('✅ Auth service ready!');
});