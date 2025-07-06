# AI Chatbot Service

An intelligent chatbot service powered by Amazon Bedrock Agents for the Spy Gadgets retail store. This service provides natural language interaction capabilities with specialized AI agents for different aspects of the shopping experience.

## Features

### 🤖 Multi-Agent Architecture
- **Product Expert Agent**: Deep knowledge about spy gadgets, specifications, and recommendations
- **Shopping Assistant Agent**: Handles cart operations, orders, and purchase assistance  
- **Customer Service Agent**: General support, guidance, and help

### 🧠 Amazon Bedrock Integration
- Powered by Amazon Bedrock Agents for advanced AI capabilities
- Natural language understanding and generation
- Context-aware conversations with memory
- Intelligent routing to appropriate specialized agents

### 💬 Conversation Management
- Persistent conversation sessions with unique IDs
- Message history and context preservation
- User identification and personalization
- Real-time chat capabilities

### 🔗 Microservices Integration
- Seamless integration with existing retail microservices
- Product catalog access for real-time inventory
- Cart and order management capabilities
- Authentication service integration

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and agent availability.

### Start Conversation
```
POST /chat/start
Body: { "userId": "optional-user-id" }
```
Initializes a new conversation session and returns a conversation ID.

### Send Message
```
POST /chat/message
Body: {
  "conversationId": "uuid",
  "message": "user message text",
  "userId": "optional-user-id"
}
```
Processes user message through appropriate AI agent and returns response.

### Get Conversation History
```
GET /chat/:conversationId
```
Retrieves complete conversation history for a session.

## Architecture

### Agent Routing Logic
The service intelligently routes messages to the most appropriate agent:

- **Product queries** → Product Expert Agent
  - Keywords: product, gadget, spy, camera, device, show, find, search, recommend, compare
  
- **Shopping queries** → Shopping Assistant Agent  
  - Keywords: cart, buy, purchase, order, checkout, add to cart
  
- **General queries** → Customer Service Agent
  - Default for greetings, help requests, and general support

### Response Types
- `welcome`: Initial greeting message
- `product_results`: Product search results with actionable items
- `cart_assistance`: Shopping cart related help
- `order_assistance`: Order and purchase guidance
- `greeting`: Welcome and introduction messages
- `help_menu`: Available commands and capabilities
- `error`: Error handling and fallback responses

## Configuration

### Environment Variables
- `AWS_REGION`: AWS region for Bedrock services (default: us-east-1)
- `PORT`: Service port (default: 80)

### Microservice Endpoints
The service connects to these retail microservices:
- **Catalog Service**: Product information and search
- **Cart Service**: Shopping cart management
- **Orders Service**: Order processing and history
- **Checkout Service**: Payment and fulfillment
- **Auth Service**: User authentication

## Development

### Local Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

### Docker Build
```bash
# Build image
docker build -t ai-chatbot-service .

# Run container
docker run -p 80:80 ai-chatbot-service
```

### Testing
```bash
# Test health endpoint
curl http://localhost:80/health

# Start conversation
curl -X POST http://localhost:80/chat/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'

# Send message
curl -X POST http://localhost:80/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "your-conversation-id",
    "message": "Show me spy cameras",
    "userId": "test-user"
  }'
```

## Deployment

### ECS Deployment
This service is designed to run on Amazon ECS with:
- Application Load Balancer integration
- Health check configuration
- Auto-scaling capabilities
- CloudWatch logging

### Required IAM Permissions
The service requires these AWS permissions:
- `bedrock:InvokeAgent`
- `bedrock:GetAgent`
- `bedrock:ListAgents`
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`

## Example Interactions

### Product Search
```
User: "Show me spy cameras"
Agent: "🕵️ Great choice! I found 3 spy gadgets matching your search:
• **Hidden Camera Pen** - $89.99 - Professional spy pen with HD recording...
• **Wireless Spy Camera** - $129.99 - Compact wireless camera with night vision...
• **Button Camera** - $59.99 - Ultra-small button camera for discrete recording..."
```

### Shopping Assistance
```
User: "Add the spy camera to my cart"
Agent: "🛒 I'd be happy to help you add items to your cart! To add a specific spy gadget, please tell me which product you'd like, or I can show you our available products first."
```

### Customer Service
```
User: "Hello"
Agent: "👋 Hello! Welcome to Spy Gadgets Store! I'm your AI customer service assistant. I'm here to help you with finding the perfect spy gadgets, product information, shopping assistance, and general questions."
```

## Future Enhancements

- Real Amazon Bedrock Agents integration (currently using simulation)
- Knowledge base integration for enhanced product information
- Advanced conversation analytics and insights
- Multi-language support
- Voice interaction capabilities
- Integration with recommendation engines