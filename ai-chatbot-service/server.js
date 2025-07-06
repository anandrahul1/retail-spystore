const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { BedrockAgentManager } = require('./bedrock-agents');

const app = express();
const port = 80;

// AWS Configuration
AWS.config.update({
    region: 'us-east-1'
});

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['DNT', 'User-Agent', 'X-Requested-With', 'If-Modified-Since', 'Cache-Control', 'Content-Type', 'Range', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Configuration for existing microservices
const MICROSERVICES = {
    catalog: 'http://54.173.254.191',
    cart: 'http://3.92.161.247',
    orders: 'http://54.234.57.189',
    checkout: 'http://13.220.180.178',
    auth: 'http://54.226.97.18'
};

// Initialize Bedrock Agent Manager
const bedrockAgentManager = new BedrockAgentManager(MICROSERVICES);

// In-memory conversation storage (in production, use DynamoDB)
let conversations = {};

// Initialize Bedrock Agents on startup
async function initializeBedrockAgents() {
    try {
        console.log('🤖 Initializing Amazon Bedrock Agents...');
        const success = await bedrockAgentManager.initializeAgents();
        if (success) {
            console.log('✅ Bedrock Agents initialized successfully');
        } else {
            console.log('⚠️ Bedrock Agents initialization failed, falling back to basic responses');
        }
    } catch (error) {
        console.error('❌ Error initializing Bedrock Agents:', error);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'ai-chatbot',
        bedrockEnabled: true,
        agents: ['productExpert', 'shoppingAssistant', 'customerService']
    });
});

// Start a new conversation
app.post('/chat/start', async (req, res) => {
    try {
        const conversationId = uuidv4();
        const { userId } = req.body;
        
        conversations[conversationId] = {
            id: conversationId,
            userId: userId || 'anonymous',
            messages: [],
            context: {
                currentProducts: [],
                cartItems: [],
                userPreferences: {}
            },
            createdAt: new Date().toISOString()
        };
        
        const welcomeMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: `🕵️ Welcome to Spy Gadgets Store! I'm your AI shopping assistant powered by Amazon Bedrock.

I'm actually a team of specialized AI agents:
• 🔍 **Product Expert** - Deep knowledge about spy gadgets and specifications
• 🛒 **Shopping Assistant** - Help with cart, orders, and purchases  
• 🎯 **Customer Service** - General support and guidance

I can help you with natural conversations about:
• Finding the perfect spy gadgets for your missions
• Detailed product comparisons and recommendations
• Adding items to cart and managing orders
• Technical specifications and use cases

What spy gadget adventure can I help you with today?`,
            timestamp: new Date().toISOString(),
            type: 'welcome',
            agent: 'system'
        };
        
        conversations[conversationId].messages.push(welcomeMessage);
        
        res.json({
            success: true,
            conversationId: conversationId,
            message: welcomeMessage
        });
        
    } catch (error) {
        console.error('Error starting conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start conversation'
        });
    }
});

// Send a message to the AI chatbot (now with real Bedrock Agents)
app.post('/chat/message', async (req, res) => {
    try {
        const { conversationId, message, userId } = req.body;
        
        if (!conversationId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Conversation ID and message are required'
            });
        }
        
        const conversation = conversations[conversationId];
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }
        
        // Add user message to conversation
        const userMessage = {
            id: uuidv4(),
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        conversation.messages.push(userMessage);
        
        console.log(`🗣️ Processing message: "${message}"`);
        
        // Process the message with Bedrock Agents
        const aiResponse = await processWithBedrockAgents(message, conversation, userId);
        
        // Add AI response to conversation
        const assistantMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: aiResponse.content,
            timestamp: new Date().toISOString(),
            agent: aiResponse.agent,
            functionCalled: aiResponse.functionCalled,
            products: aiResponse.products || [],
            actions: aiResponse.actions || [],
            type: aiResponse.type || 'response'
        };
        conversation.messages.push(assistantMessage);
        
        console.log(`🤖 Response from ${aiResponse.agent} agent: ${aiResponse.content.substring(0, 100)}...`);
        
        res.json({
            success: true,
            message: assistantMessage,
            conversationId: conversationId
        });
        
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process message'
        });
    }
});

// Get conversation history
app.get('/chat/:conversationId', (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversation = conversations[conversationId];
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }
        
        res.json({
            success: true,
            conversation: conversation
        });
        
    } catch (error) {
        console.error('Error getting conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversation'
        });
    }
});

// Process message with real Bedrock Agents
async function processWithBedrockAgents(message, conversation, userId) {
    try {
        console.log('🧠 Routing message to appropriate Bedrock Agent...');
        
        // Determine which agent should handle this request
        const agentType = await bedrockAgentManager.routeToAgent(message, conversation.messages);
        console.log(`🎯 Routing to ${agentType} agent`);
        
        // Get conversation history for context
        const conversationHistory = conversation.messages.slice(-5); // Last 5 messages for context
        
        // Process with the appropriate Bedrock Agent
        const response = await bedrockAgentManager.processWithAgent(
            agentType, 
            message, 
            conversationHistory, 
            userId
        );
        
        // Enhance response with additional data if function was called
        if (response.functionResult && response.functionResult.products) {
            response.products = response.functionResult.products;
            response.type = 'product_results';
        }
        
        // Add suggested actions based on the response
        if (response.products && response.products.length > 0) {
            response.actions = ['view_details', 'add_to_cart', 'compare'];
        }
        
        return response;
        
    } catch (error) {
        console.error('Error in Bedrock Agents processing:', error);
        
        // Fallback to basic response if Bedrock fails
        return {
            content: "I apologize, but I'm having trouble with my AI processing right now. Let me try to help you with a basic response. What specific spy gadget are you looking for?",
            agent: 'fallback',
            type: 'error'
        };
    }
}

// Start the server and initialize Bedrock Agents
app.listen(port, '0.0.0.0', async () => {
    console.log(`🚀 AI Chatbot service listening on port ${port}`);
    console.log('🌐 CORS enabled for all origins');
    console.log('🔗 Connected microservices:', Object.keys(MICROSERVICES));
    console.log('🤖 Amazon Bedrock Agents integration enabled');
    
    // Initialize Bedrock Agents
    await initializeBedrockAgents();
    
    console.log('✅ AI Chatbot service ready with Bedrock Agents!');
});