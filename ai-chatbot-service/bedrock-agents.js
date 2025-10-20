const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

class BedrockAgentManager {
    constructor(microservices) {
        this.microservices = microservices;
        this.bedrockAgent = new AWS.BedrockAgent({
            region: 'us-east-1'
        });
        this.bedrockRuntime = new AWS.BedrockAgentRuntime({
            region: 'us-east-1'
        });
        
        // Agent configurations
        this.agents = {
            productExpert: {
                id: null,
                aliasId: null,
                name: 'Product Expert Agent',
                description: 'Specialized in spy gadgets knowledge and product recommendations'
            },
            shoppingAssistant: {
                id: null,
                aliasId: null,
                name: 'Shopping Assistant Agent',
                description: 'Handles cart operations, orders, and purchase assistance'
            },
            customerService: {
                id: null,
                aliasId: null,
                name: 'Customer Service Agent',
                description: 'General customer support and guidance'
            }
        };
        
        this.initialized = false;
    }

    async initializeAgents() {
        try {
            console.log('🔧 Setting up Bedrock Agents...');
            
            // For now, we'll use a mock initialization
            // In a real implementation, you would:
            // 1. Create or retrieve existing Bedrock Agents
            // 2. Set up knowledge bases
            // 3. Configure action groups with Lambda functions
            // 4. Create agent aliases
            
            this.agents.productExpert.id = 'mock-product-expert-id';
            this.agents.productExpert.aliasId = 'mock-product-expert-alias';
            
            this.agents.shoppingAssistant.id = 'mock-shopping-assistant-id';
            this.agents.shoppingAssistant.aliasId = 'mock-shopping-assistant-alias';
            
            this.agents.customerService.id = 'mock-customer-service-id';
            this.agents.customerService.aliasId = 'mock-customer-service-alias';
            
            this.initialized = true;
            console.log('✅ Mock Bedrock Agents initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Bedrock Agents:', error);
            return false;
        }
    }

    async routeToAgent(message, conversationHistory) {
        const lowerMessage = message.toLowerCase();
        
        // User profile/account-related queries
        if (lowerMessage.includes('profile') ||
            lowerMessage.includes('account') ||
            lowerMessage.includes('my details') ||
            lowerMessage.includes('my info') ||
            lowerMessage.includes('personal information') ||
            lowerMessage.includes('who am i') ||
            lowerMessage.includes('my data') ||
            lowerMessage.includes('account details') ||
            lowerMessage.includes('user info') ||
            lowerMessage.includes('show me my') ||
            lowerMessage.includes('my profile') ||
            lowerMessage.includes('my account')) {
            return 'customerService';
        }
        
        // Product-related queries
        if (lowerMessage.includes('product') || 
            lowerMessage.includes('gadget') || 
            lowerMessage.includes('spy') ||
            lowerMessage.includes('camera') ||
            lowerMessage.includes('device') ||
            lowerMessage.includes('show me') ||
            lowerMessage.includes('find') ||
            lowerMessage.includes('search') ||
            lowerMessage.includes('recommend') ||
            lowerMessage.includes('compare')) {
            return 'productExpert';
        }
        
        // Shopping-related queries
        if (lowerMessage.includes('cart') ||
            lowerMessage.includes('buy') ||
            lowerMessage.includes('purchase') ||
            lowerMessage.includes('order') ||
            lowerMessage.includes('checkout') ||
            lowerMessage.includes('add to cart') ||
            lowerMessage.includes('remove from cart')) {
            return 'shoppingAssistant';
        }
        
        // Default to customer service for general queries
        return 'customerService';
    }

    async processWithAgent(agentType, message, conversationHistory, userId) {
        try {
            if (!this.initialized) {
                return await this.fallbackResponse(message, agentType);
            }

            // For now, we'll simulate Bedrock Agent responses
            // In a real implementation, you would call:
            // const response = await this.bedrockRuntime.invokeAgent({
            //     agentId: this.agents[agentType].id,
            //     agentAliasId: this.agents[agentType].aliasId,
            //     sessionId: userId || 'anonymous',
            //     inputText: message
            // }).promise();

            return await this.simulateAgentResponse(agentType, message, userId);
            
        } catch (error) {
            console.error(`Error processing with ${agentType} agent:`, error);
            return await this.fallbackResponse(message, agentType);
        }
    }

    async simulateAgentResponse(agentType, message, userId) {
        const lowerMessage = message.toLowerCase();
        
        switch (agentType) {
            case 'productExpert':
                return await this.handleProductExpertQuery(message, lowerMessage);
            
            case 'shoppingAssistant':
                return await this.handleShoppingAssistantQuery(message, lowerMessage, userId);
            
            case 'customerService':
                return await this.handleCustomerServiceQuery(message, lowerMessage, userId);
            
            default:
                return await this.fallbackResponse(message, agentType);
        }
    }

    async handleProductExpertQuery(message, lowerMessage) {
        try {
            // Fetch products from catalog service
            const response = await fetch(`${this.microservices.catalog}/products`);
            const products = await response.json();
            
            // Filter products based on query
            let filteredProducts = products;
            
            if (lowerMessage.includes('camera')) {
                filteredProducts = products.filter(p => 
                    p.name.toLowerCase().includes('camera') || 
                    p.description.toLowerCase().includes('camera')
                );
            } else if (lowerMessage.includes('watch')) {
                filteredProducts = products.filter(p => 
                    p.name.toLowerCase().includes('watch') || 
                    p.description.toLowerCase().includes('watch')
                );
            } else if (lowerMessage.includes('pen')) {
                filteredProducts = products.filter(p => 
                    p.name.toLowerCase().includes('pen') || 
                    p.description.toLowerCase().includes('pen')
                );
            }
            
            if (filteredProducts.length === 0) {
                return {
                    content: `🔍 I searched our spy gadget catalog but couldn't find specific matches for "${message}". However, I can show you our popular spy gadgets! We have ${products.length} amazing spy devices available. Would you like me to show you our top recommendations?`,
                    agent: 'productExpert',
                    products: products.slice(0, 3),
                    type: 'product_search'
                };
            }
            
            const productList = filteredProducts.slice(0, 5).map(p => 
                `• **${p.name}** - $${p.price} - ${p.description.substring(0, 100)}...`
            ).join('\n');
            
            return {
                content: `🕵️ Great choice! I found ${filteredProducts.length} spy gadgets matching your search:\n\n${productList}\n\nWould you like detailed specifications for any of these, or shall I help you add one to your cart?`,
                agent: 'productExpert',
                products: filteredProducts.slice(0, 5),
                type: 'product_results',
                functionCalled: 'searchProducts'
            };
            
        } catch (error) {
            console.error('Error in product expert query:', error);
            return {
                content: "🔍 I'm having trouble accessing our product catalog right now. Let me try to help you with general spy gadget information. What specific type of spy device are you interested in?",
                agent: 'productExpert',
                type: 'error'
            };
        }
    }

    async handleShoppingAssistantQuery(message, lowerMessage, userId) {
        if (lowerMessage.includes('cart') && lowerMessage.includes('add')) {
            return {
                content: `🛒 I'd be happy to help you add items to your cart! To add a specific spy gadget, please tell me which product you'd like, or I can show you our available products first. 

You can say something like:
• "Add the spy camera to my cart"
• "Show me products to add to cart"
• "I want to buy the watch gadget"

What would you like to add to your cart?`,
                agent: 'shoppingAssistant',
                type: 'cart_assistance',
                actions: ['show_products', 'view_cart']
            };
        }
        
        if (lowerMessage.includes('order') || lowerMessage.includes('purchase')) {
            return {
                content: `📦 I can help you with orders and purchases! Here's what I can assist you with:

• **View your cart** - See what items you've selected
• **Checkout process** - Guide you through purchasing
• **Order status** - Check on existing orders
• **Product recommendations** - Find the perfect spy gadgets

What would you like to do first?`,
                agent: 'shoppingAssistant',
                type: 'order_assistance',
                actions: ['view_cart', 'checkout', 'show_products']
            };
        }
        
        return {
            content: `🛒 I'm your shopping assistant! I can help you with:

• Adding spy gadgets to your cart
• Managing your orders
• Checkout assistance
• Product recommendations for purchase

What shopping task can I help you with today?`,
            agent: 'shoppingAssistant',
            type: 'shopping_general'
        };
    }

    async handleCustomerServiceQuery(message, lowerMessage, userId) {
        // Check if this is a profile/account related query
        if (lowerMessage.includes('profile') ||
            lowerMessage.includes('account') ||
            lowerMessage.includes('my details') ||
            lowerMessage.includes('my info') ||
            lowerMessage.includes('personal information') ||
            lowerMessage.includes('who am i') ||
            lowerMessage.includes('my data') ||
            lowerMessage.includes('account details') ||
            lowerMessage.includes('user info') ||
            lowerMessage.includes('show me my') ||
            lowerMessage.includes('my profile') ||
            lowerMessage.includes('my account')) {
            return await this.handleUserProfileQuery(message, lowerMessage, userId);
        }
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            return {
                content: `👋 Hello! Welcome to Spy Gadgets Store! I'm your AI customer service assistant.

I'm here to help you with:
• Finding the perfect spy gadgets for your needs
• Product information and comparisons
• Shopping assistance and cart management
• Viewing your account and profile information
• General questions about our store

What can I help you discover today?`,
                agent: 'customerService',
                type: 'greeting'
            };
        }
        
        if (lowerMessage.includes('help')) {
            return {
                content: `🎯 I'm here to help! Here's what I can assist you with:

**Product Discovery:**
• "Show me spy cameras"
• "Find gadgets under $100"
• "Compare two products"

**Shopping:**
• "Add to cart"
• "View my cart"
• "Help me checkout"

**Account & Profile:**
• "Show me my profile"
• "What are my account details?"
• "Who am I?"

**Information:**
• "Tell me about this product"
• "What's popular?"
• "Shipping information"

What would you like help with?`,
                agent: 'customerService',
                type: 'help_menu'
            };
        }
        
        return {
            content: `🎯 I'm your customer service assistant! I can help you navigate our spy gadget store, answer questions about products, assist with shopping, view your account information, or provide general support.

What can I help you with today?`,
            agent: 'customerService',
            type: 'general_support'
        };
    }

    async handleUserProfileQuery(message, lowerMessage, userId) {
        try {
            // Check if user is authenticated
            if (!userId || userId === 'anonymous') {
                return {
                    content: `🔐 I'd love to show you your profile information, but I need to verify your identity first!

To view your account details, you'll need to:
• Log in to your account
• Provide your user credentials

Once you're logged in, I can show you:
• Your personal information (name, email, phone)
• Account status and preferences
• Registration date and activity
• Profile settings

Would you like help with logging in, or do you have other questions I can assist with?`,
                    agent: 'customerService',
                    type: 'authentication_required',
                    actions: ['login', 'register', 'help']
                };
            }

            console.log(`🔍 Fetching profile for user: ${userId}`);
            
            // Fetch user profile from auth service
            const response = await fetch(`${this.microservices.auth}/auth/users/${userId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return {
                        content: `❌ I couldn't find your user profile. This might be because:
• Your account may not exist in our system
• There might be a temporary issue with our user database

Would you like me to help you with:
• Creating a new account
• Troubleshooting login issues
• General account support

What would you like to do?`,
                        agent: 'customerService',
                        type: 'profile_not_found',
                        actions: ['register', 'login_help', 'contact_support']
                    };
                } else if (response.status === 403) {
                    return {
                        content: `🔒 I don't have permission to access your profile information. This usually means:
• Your session may have expired
• You might need to log in again
• There could be an authentication issue

Please try logging in again, and then ask me to show your profile. I'll be happy to help once you're properly authenticated!`,
                        agent: 'customerService',
                        type: 'access_denied',
                        actions: ['login', 'help']
                    };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            const userData = await response.json();
            const user = userData.user;

            if (!user) {
                throw new Error('No user data received from auth service');
            }

            // Format user profile information
            const profileInfo = this.formatUserProfile(user);
            
            return {
                content: profileInfo,
                agent: 'customerService',
                type: 'profile_display',
                actions: ['update_profile', 'change_password', 'view_orders'],
                userData: {
                    userId: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    role: user.role
                }
            };

        } catch (error) {
            console.error('Error fetching user profile:', error);
            
            return {
                content: `⚠️ I'm having trouble accessing your profile information right now. This could be due to:
• A temporary connection issue with our user database
• System maintenance in progress
• Network connectivity problems

Please try again in a moment, or let me know if you need help with something else. I'm still here to assist you with:
• Product searches and recommendations
• Shopping cart assistance
• General store information

What else can I help you with?`,
                agent: 'customerService',
                type: 'profile_error',
                actions: ['try_again', 'browse_products', 'contact_support']
            };
        }
    }

    formatUserProfile(user) {
        const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const lastLogin = user.lastLoginAt 
            ? new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : 'Never';

        let profileContent = `👤 **Your Spy Gadgets Store Profile**

**Personal Information:**
• **Name:** ${user.firstName} ${user.lastName}
• **Email:** ${user.email}`;

        if (user.phone) {
            profileContent += `\n• **Phone:** ${user.phone}`;
        }

        profileContent += `

**Account Details:**
• **User ID:** ${user.id}
• **Role:** ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
• **Account Status:** ${user.isActive ? '✅ Active' : '❌ Inactive'}
• **Email Verified:** ${user.isEmailVerified ? '✅ Verified' : '⚠️ Not Verified'}

**Activity:**
• **Member Since:** ${joinDate}
• **Last Login:** ${lastLogin}`;

        if (user.profile && user.profile.preferences && Object.keys(user.profile.preferences).length > 0) {
            profileContent += `\n\n**Preferences:**`;
            Object.entries(user.profile.preferences).forEach(([key, value]) => {
                profileContent += `\n• **${key}:** ${value}`;
            });
        }

        profileContent += `

**What would you like to do?**
• Update your profile information
• Change your password
• View your order history
• Browse spy gadgets
• Get shopping assistance

Just let me know how I can help! 🕵️`;

        return profileContent;
    }

    async fallbackResponse(message, agentType) {
        return {
            content: `I apologize, but I'm having some technical difficulties with my AI processing. However, I'm still here to help! 

You can ask me about:
• Spy gadgets and products
• Adding items to your cart
• General shopping assistance

What would you like to know about our spy gadget collection?`,
            agent: agentType || 'fallback',
            type: 'fallback'
        };
    }
}

module.exports = { BedrockAgentManager };