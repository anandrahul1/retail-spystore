# 🕵️ Spy Gadgets Retail Store

A complete microservices-based e-commerce platform for spy gadgets, featuring AI-powered chatbot assistance using Amazon Bedrock Agents.

## 🏗️ Architecture Overview

This application demonstrates a modern microservices architecture deployed on AWS ECS with the following components:

### 🤖 AI-Powered Features
- **Amazon Bedrock Agents Integration**: Multi-agent AI system for intelligent customer assistance
- **Natural Language Processing**: Conversational shopping experience
- **Intelligent Product Recommendations**: Context-aware suggestions

### 🔧 Microservices
- **UI Service**: Frontend web application with integrated AI chat widget
- **AI Chatbot Service**: Amazon Bedrock-powered conversational AI
- **Catalog Service**: Product information and search functionality
- **Cart Service**: Shopping cart management
- **Orders Service**: Order processing and history
- **Checkout Service**: Payment processing simulation
- **Auth Service**: User authentication and authorization

### ☁️ AWS Infrastructure
- **Amazon ECS**: Container orchestration
- **Application Load Balancer**: Traffic routing and SSL termination
- **Amazon ECR**: Container image registry
- **Amazon Bedrock**: AI/ML services for chatbot
- **CloudWatch**: Logging and monitoring

## 🚀 Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- Docker installed and running
- Node.js 18+ (for local development)

### 1. Clone Repository
```bash
git clone https://github.com/anandrahul1/retail-spystore.git
cd retail-spystore
```

### 2. Deploy to AWS
```bash
# Make deployment script executable
chmod +x deploy-retail-store.sh

# Deploy the entire application
./deploy-retail-store.sh
```

### 3. Access the Application
After deployment, the script will provide:
- **Application URL**: Your retail store frontend
- **Load Balancer DNS**: Direct ALB access
- **Service Endpoints**: Individual microservice URLs

## 🛍️ Features

### 🕵️ Product Catalog
- **8 Spy Gadget Categories**: Surveillance, wearable, detection, audio, vision, tracking
- **Advanced Search**: Filter by category, price range, features
- **Product Details**: Specifications, features, availability
- **Real-time Inventory**: Stock tracking and availability

### 🤖 AI Shopping Assistant
- **Multi-Agent System**:
  - 🔍 **Product Expert**: Deep product knowledge and recommendations
  - 🛒 **Shopping Assistant**: Cart and order management
  - 🎯 **Customer Service**: General support, guidance, and user account management
- **Natural Conversations**: Ask questions in plain English
- **Context Awareness**: Remembers conversation history
- **Smart Routing**: Automatically directs queries to appropriate agent
- **User Profile Access**: View account details and personal information through chat

### 🛒 Shopping Experience
- **Interactive Cart**: Add, remove, update quantities
- **Real-time Totals**: Automatic price calculations
- **Cart Persistence**: Maintains cart across sessions
- **Order Processing**: Complete checkout workflow

### 💬 Chat Integration
- **Embedded Chat Widget**: Seamless UI integration
- **Conversation Management**: Persistent chat sessions
- **Rich Responses**: Product cards, action buttons
- **Error Handling**: Graceful fallback responses

## 🏛️ Service Details

### UI Service (`ui-service/`)
- **Technology**: HTML5, CSS3, JavaScript
- **Features**: Responsive design, AI chat widget, product display
- **Port**: 80
- **Health Check**: `/health`

### AI Chatbot Service (`ai-chatbot-service/`)
- **Technology**: Node.js, Express, AWS SDK
- **AI Platform**: Amazon Bedrock Agents
- **Features**: Multi-agent routing, conversation management
- **Port**: 80
- **Endpoints**: `/chat/start`, `/chat/message`, `/chat/:id`

### Catalog Service (`catalog-service/`)
- **Technology**: Node.js, Express
- **Features**: Product search, filtering, categories
- **Port**: 80
- **Endpoints**: `/products`, `/categories`, `/search`, `/featured`

### Cart Service (`cart-service/`)
- **Technology**: Node.js, Express
- **Features**: Cart CRUD operations, validation
- **Port**: 80
- **Endpoints**: `/cart/:userId`, `/cart/:userId/items`

## 🔧 Development

### Local Development Setup
```bash
# Install dependencies for each service
cd ai-chatbot-service && npm install
cd ../catalog-service && npm install
cd ../cart-service && npm install

# Start services locally (different terminals)
cd ai-chatbot-service && npm start
cd catalog-service && npm start
cd cart-service && npm start
```

### Docker Development
```bash
# Build individual service
cd ai-chatbot-service
docker build -t ai-chatbot-service .
docker run -p 8080:80 ai-chatbot-service

# Or use docker-compose (if available)
docker-compose up
```

### Testing Services
```bash
# Test catalog service
curl http://localhost/products

# Test cart service
curl http://localhost/cart/test-user

# Test AI chatbot
curl -X POST http://localhost/chat/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'
```

## 🚀 Deployment Architecture

### ECS Configuration
- **Cluster**: retail-store-cluster
- **Services**: One per microservice
- **Task Definitions**: Containerized applications
- **Auto Scaling**: Based on CPU/memory utilization

### Load Balancer Routing
```
ALB (retail-store-alb)
├── / → UI Service (retail-ui-tg)
├── /chat/* → AI Chatbot Service (retail-chatbot-tg)
├── /api/catalog/* → Catalog Service
├── /api/cart/* → Cart Service
└── /api/orders/* → Orders Service
```

### Security
- **VPC**: Isolated network environment
- **Security Groups**: Controlled access between services
- **IAM Roles**: Least privilege access for ECS tasks
- **HTTPS**: SSL/TLS termination at load balancer

## 📊 Monitoring & Logging

### CloudWatch Integration
- **Service Logs**: Centralized logging for all microservices
- **Metrics**: CPU, memory, request counts
- **Alarms**: Automated alerts for service health
- **Dashboards**: Real-time monitoring views

### Health Checks
All services expose `/health` endpoints for:
- Load balancer health checks
- Service discovery
- Monitoring integration

## 🧪 Example Interactions

### AI Chatbot Examples
```
User: "Show me spy cameras under $100"
AI: "🔍 I found 2 spy cameras under $100:
• Button Camera - $59.99 - Ultra-small discrete recording
• Voice Recorder Keychain - $39.99 - Crystal clear audio
Would you like details on either of these?"

User: "Add the button camera to my cart"
AI: "🛒 I'll help you add the Button Camera to your cart! 
Let me process that for you..."

User: "Show me my profile"
AI: "👤 **Your Spy Gadgets Store Profile**
**Personal Information:**
• **Name:** Agent Smith
• **Email:** agent.smith@spystore.com
• **Account Status:** ✅ Active
• **Member Since:** January 15, 2024
What would you like to do next?"
```

### API Examples
```bash
# Get products
GET /products?category=surveillance&maxPrice=100

# Add to cart
POST /cart/user123/items
{
  "productId": "abc-123",
  "name": "Button Camera",
  "price": 59.99,
  "quantity": 1
}

# Start AI conversation
POST /chat/start
{
  "userId": "user123"
}
```

## 🔄 CI/CD Pipeline

### Deployment Process
1. **Code Push**: Changes pushed to GitHub
2. **Image Build**: Docker images built and pushed to ECR
3. **Task Definition Update**: New task definitions created
4. **Service Update**: ECS services updated with new images
5. **Health Checks**: Automated verification of deployment

### Rollback Strategy
- **Blue/Green Deployment**: Zero-downtime updates
- **Health Check Gates**: Automatic rollback on failures
- **Manual Rollback**: Quick revert to previous versions

## 🧹 Cleanup

To remove all AWS resources:
```bash
chmod +x cleanup-retail-store.sh
./cleanup-retail-store.sh
```

## 📚 Additional Resources

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [AI Chatbot Service README](ai-chatbot-service/README.md) - Bedrock integration details
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the [Deployment Guide](DEPLOYMENT_GUIDE.md)
2. Review service-specific README files
3. Check CloudWatch logs for errors
4. Open an issue on GitHub

---

**Built with ❤️ for the spy gadget community** 🕵️‍♂️🔍