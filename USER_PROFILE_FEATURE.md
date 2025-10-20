# User Profile Feature Implementation

## Overview

The AI chatbot service has been enhanced with user profile functionality, allowing users to view their account details and personal information through natural language conversations with the chatbot.

## What's New

### 🆕 Features Added

1. **Profile Query Detection**: The chatbot now recognizes when users ask about their profile, account, or personal information
2. **User Authentication**: Secure access to profile data with proper authentication checks
3. **Comprehensive Profile Display**: Shows user details in a conversational, user-friendly format
4. **Error Handling**: Graceful handling of authentication issues and service errors
5. **Integration with Auth Service**: Seamless connection to the existing authentication microservice

### 🔍 Supported Queries

Users can now ask the chatbot questions like:
- "Show me my profile"
- "What are my account details?"
- "Who am I?"
- "My personal information"
- "My account"
- "Show me my details"

### 📋 Profile Information Displayed

When a user requests their profile, the chatbot shows:
- **Personal Information**: Name, email, phone number
- **Account Details**: User ID, role, account status, email verification status
- **Activity**: Registration date, last login date
- **Preferences**: User preferences (if any are set)
- **Suggested Actions**: Update profile, change password, view orders, etc.

## Technical Implementation

### 🔧 Code Changes Made

#### 1. Enhanced Agent Routing (`bedrock-agents.js`)
- Added profile-related keyword detection in `routeToAgent()` method
- Routes profile queries to the `customerService` agent

#### 2. New Profile Handler (`bedrock-agents.js`)
- Created `handleUserProfileQuery()` method for processing profile requests
- Added `formatUserProfile()` method for user-friendly data presentation
- Integrated with auth service via HTTP API calls

#### 3. Updated Customer Service Agent (`bedrock-agents.js`)
- Enhanced `handleCustomerServiceQuery()` to detect and delegate profile queries
- Updated help menu to include profile-related options

#### 4. Dependencies (`package.json`)
- Added `node-fetch` dependency for HTTP requests to auth service

#### 5. Documentation Updates
- Updated README files with new functionality examples
- Enhanced welcome message to mention profile capabilities

### 🔐 Security Features

1. **Authentication Required**: Users must be logged in to view their profile
2. **User ID Validation**: Only authenticated users can access their own data
3. **Error Handling**: Proper responses for unauthorized access attempts
4. **Data Privacy**: Sensitive information is appropriately filtered

### 🛡️ Error Scenarios Handled

1. **Anonymous Users**: Prompts for login when profile is requested
2. **Invalid User ID**: Handles cases where user doesn't exist
3. **Service Unavailable**: Graceful degradation when auth service is down
4. **Permission Denied**: Clear messaging for authentication issues

## Usage Examples

### ✅ Successful Profile Access
```
User: "Show me my profile"
Chatbot: "👤 **Your Spy Gadgets Store Profile**

**Personal Information:**
• **Name:** Agent Smith
• **Email:** agent.smith@spystore.com
• **Phone:** +1-555-0007

**Account Details:**
• **User ID:** abc-123-def
• **Role:** Customer
• **Account Status:** ✅ Active
• **Email Verified:** ✅ Verified

**Activity:**
• **Member Since:** January 15, 2024
• **Last Login:** March 10, 2024

**What would you like to do?**
• Update your profile information
• Change your password
• View your order history
• Browse spy gadgets
• Get shopping assistance"
```

### 🔐 Authentication Required
```
User: "What are my account details?"
Chatbot: "🔐 I'd love to show you your profile information, but I need to verify your identity first!

To view your account details, you'll need to:
• Log in to your account
• Provide your user credentials

Once you're logged in, I can show you:
• Your personal information (name, email, phone)
• Account status and preferences
• Registration date and activity
• Profile settings

Would you like help with logging in, or do you have other questions I can assist with?"
```

## Testing

### 🧪 Test Script
A comprehensive test script has been created at `ai-chatbot-service/test-profile-feature.js` that validates:
- Profile query routing
- Authentication enforcement
- User data formatting
- Error handling scenarios
- Existing functionality preservation

### 🚀 Running Tests
```bash
cd ai-chatbot-service
node test-profile-feature.js
```

## Integration Points

### 🔗 Auth Service Integration
- **Endpoint Used**: `GET /auth/users/{userId}`
- **Authentication**: Requires valid user ID
- **Response Format**: JSON with user profile data

### 🤖 Agent Architecture
- **Primary Agent**: Customer Service (handles profile queries)
- **Routing Logic**: Keyword-based detection with high priority
- **Fallback**: Maintains existing functionality for other query types

## Future Enhancements

### 🔮 Potential Improvements
1. **Profile Updates**: Allow users to update their profile through chat
2. **Password Changes**: Enable password changes via chatbot
3. **Preference Management**: Set and modify user preferences
4. **Order History**: Integration with orders service for purchase history
5. **Address Management**: View and manage shipping addresses

### 🛠️ Technical Considerations
1. **Token-based Authentication**: Implement JWT token handling for enhanced security
2. **Real-time Updates**: Sync profile changes across all services
3. **Data Validation**: Add input validation for profile updates
4. **Audit Logging**: Track profile access and modifications

## Deployment Notes

### 📦 Dependencies
Ensure `node-fetch` is installed:
```bash
npm install node-fetch@^2.7.0
```

### 🌐 Service Configuration
The auth service endpoint is configured in the `MICROSERVICES` object in `server.js`. Update this if the auth service URL changes.

### 🔍 Monitoring
Monitor the following for the new functionality:
- Profile query success rates
- Authentication failure rates
- Auth service response times
- Error patterns in profile access

## Conclusion

The user profile feature enhances the chatbot's capabilities by providing users with easy access to their account information through natural language queries. The implementation maintains security best practices while offering a seamless user experience that integrates well with the existing microservices architecture.

Users can now have complete conversations about their account status, personal information, and account management needs, making the AI assistant more comprehensive and useful for customer service scenarios.