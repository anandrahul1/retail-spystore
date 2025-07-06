#!/bin/bash

# Retail Store Sample App Deployment Script
# This script deploys the retail store application to AWS ECS with Fargate

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
DB_PASSWORD=${DB_PASSWORD:-RetailStore123!}
ENVIRONMENT=${ENVIRONMENT:-poc}

echo "🚀 Starting Retail Store Sample App deployment..."
echo "Region: $AWS_REGION"
echo "Environment: $ENVIRONMENT"

# Function to check if stack exists
stack_exists() {
    aws cloudformation describe-stacks --stack-name "$1" --region "$AWS_REGION" >/dev/null 2>&1
}

# Function to wait for stack completion
wait_for_stack() {
    echo "⏳ Waiting for stack $1 to complete..."
    aws cloudformation wait stack-create-complete --stack-name "$1" --region "$AWS_REGION" 2>/dev/null || \
    aws cloudformation wait stack-update-complete --stack-name "$1" --region "$AWS_REGION"
    echo "✅ Stack $1 completed successfully"
}

# Step 1: Deploy shared infrastructure (VPC, RDS, DynamoDB, SQS)
echo "📦 Step 1: Deploying shared infrastructure..."
aws cloudformation deploy \
    --template-file cloudformation-templates/retail-store-shared-infrastructure.json \
    --stack-name retail-store-shared \
    --parameter-overrides \
        DBPassword="$DB_PASSWORD" \
        Environment="$ENVIRONMENT" \
    --capabilities CAPABILITY_IAM \
    --region "$AWS_REGION"

wait_for_stack "retail-store-shared"

# Get VPC and subnet information
VPC_ID=$(aws cloudformation describe-stacks --stack-name retail-store-shared --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`VPCId`].OutputValue' --output text)
PUBLIC_SUBNET_1=$(aws cloudformation describe-stacks --stack-name retail-store-shared --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet1Id`].OutputValue' --output text)
PUBLIC_SUBNET_2=$(aws cloudformation describe-stacks --stack-name retail-store-shared --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet2Id`].OutputValue' --output text)
CATALOG_DB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name retail-store-shared --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`CatalogDatabaseEndpoint`].OutputValue' --output text)
ORDERS_DB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name retail-store-shared --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`OrdersDatabaseEndpoint`].OutputValue' --output text)

echo "🔍 Infrastructure details:"
echo "VPC ID: $VPC_ID"
echo "Public Subnet 1: $PUBLIC_SUBNET_1"
echo "Public Subnet 2: $PUBLIC_SUBNET_2"
echo "Catalog DB Endpoint: $CATALOG_DB_ENDPOINT"
echo "Orders DB Endpoint: $ORDERS_DB_ENDPOINT"

# Step 2: Deploy ECR repositories for each service
echo "📦 Step 2: Creating ECR repositories..."

services=("catalog" "cart" "orders" "checkout" "ui")

for service in "${services[@]}"; do
    echo "Creating ECR repository for retail-$service..."
    aws cloudformation deploy \
        --template-file "src/$service/cloudformation-templates/retail-$service-ecr-infrastructure.json" \
        --stack-name "retail-$service-ecr" \
        --capabilities CAPABILITY_IAM \
        --region "$AWS_REGION"
done

# Step 3: Build and push Docker images
echo "🐳 Step 3: Building and pushing Docker images..."

for service in "${services[@]}"; do
    echo "Building and pushing retail-$service..."
    
    # Get ECR repository URI
    ECR_URI=$(aws cloudformation describe-stacks --stack-name "retail-$service-ecr" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' --output text)
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_URI"
    
    # Build and push image
    cd "src/$service"
    docker build -t "retail-$service:latest" .
    docker tag "retail-$service:latest" "$ECR_URI:latest"
    docker push "$ECR_URI:latest"
    cd ../..
    
    echo "✅ retail-$service image pushed to $ECR_URI"
done

# Step 4: Deploy ECS services
echo "📦 Step 4: Deploying ECS services..."

# Deploy catalog service
echo "Deploying catalog service..."
CATALOG_ECR_URI=$(aws cloudformation describe-stacks --stack-name "retail-catalog-ecr" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' --output text)
aws cloudformation deploy \
    --template-file "src/catalog/cloudformation-templates/retail-catalog-ecs-infrastructure.json" \
    --stack-name "retail-catalog-ecs" \
    --parameter-overrides \
        AppName="retail-catalog" \
        ImageUri="$CATALOG_ECR_URI:latest" \
        VpcId="$VPC_ID" \
        SubnetIds="$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2" \
        DatabaseEndpoint="$CATALOG_DB_ENDPOINT" \
        DatabasePassword="$DB_PASSWORD" \
    --capabilities CAPABILITY_IAM \
    --region "$AWS_REGION"

# Deploy cart service
echo "Deploying cart service..."
CART_ECR_URI=$(aws cloudformation describe-stacks --stack-name "retail-cart-ecr" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' --output text)
aws cloudformation deploy \
    --template-file "src/cart/cloudformation-templates/retail-cart-ecs-infrastructure.json" \
    --stack-name "retail-cart-ecs" \
    --parameter-overrides \
        AppName="retail-cart" \
        ImageUri="$CART_ECR_URI:latest" \
        VpcId="$VPC_ID" \
        SubnetIds="$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2" \
    --capabilities CAPABILITY_IAM \
    --region "$AWS_REGION"

# Deploy orders service
echo "Deploying orders service..."
ORDERS_ECR_URI=$(aws cloudformation describe-stacks --stack-name "retail-orders-ecr" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' --output text)
aws cloudformation deploy \
    --template-file "src/orders/cloudformation-templates/retail-orders-ecs-infrastructure.json" \
    --stack-name "retail-orders-ecs" \
    --parameter-overrides \
        AppName="retail-orders" \
        ImageUri="$ORDERS_ECR_URI:latest" \
        VpcId="$VPC_ID" \
        SubnetIds="$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2" \
        DatabaseEndpoint="$ORDERS_DB_ENDPOINT" \
        DatabasePassword="$DB_PASSWORD" \
    --capabilities CAPABILITY_IAM \
    --region "$AWS_REGION"

# Deploy checkout service
echo "Deploying checkout service..."
CHECKOUT_ECR_URI=$(aws cloudformation describe-stacks --stack-name "retail-checkout-ecr" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' --output text)
aws cloudformation deploy \
    --template-file "src/checkout/cloudformation-templates/retail-checkout-ecs-infrastructure.json" \
    --stack-name "retail-checkout-ecs" \
    --parameter-overrides \
        AppName="retail-checkout" \
        ImageUri="$CHECKOUT_ECR_URI:latest" \
        VpcId="$VPC_ID" \
        SubnetIds="$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2" \
    --capabilities CAPABILITY_IAM \
    --region "$AWS_REGION"

# Deploy UI service (frontend)
echo "Deploying UI service..."
UI_ECR_URI=$(aws cloudformation describe-stacks --stack-name "retail-ui-ecr" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' --output text)

# Get backend service URLs
CATALOG_URL=$(aws cloudformation describe-stacks --stack-name "retail-catalog-ecs" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' --output text)
CART_URL=$(aws cloudformation describe-stacks --stack-name "retail-cart-ecs" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' --output text)
ORDERS_URL=$(aws cloudformation describe-stacks --stack-name "retail-orders-ecs" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' --output text)
CHECKOUT_URL=$(aws cloudformation describe-stacks --stack-name "retail-checkout-ecs" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' --output text)

aws cloudformation deploy \
    --template-file "src/ui/cloudformation-templates/retail-ui-ecs-infrastructure.json" \
    --stack-name "retail-ui-ecs" \
    --parameter-overrides \
        AppName="retail-ui" \
        ImageUri="$UI_ECR_URI:latest" \
        VpcId="$VPC_ID" \
        SubnetIds="$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2" \
        CatalogEndpoint="$CATALOG_URL" \
        CartEndpoint="$CART_URL" \
        OrdersEndpoint="$ORDERS_URL" \
        CheckoutEndpoint="$CHECKOUT_URL" \
    --capabilities CAPABILITY_IAM \
    --region "$AWS_REGION"

# Step 5: Display application URLs
echo "🎉 Deployment completed successfully!"
echo ""
echo "📱 Application URLs:"
echo "Frontend (UI): $(aws cloudformation describe-stacks --stack-name "retail-ui-ecs" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' --output text)"
echo "Catalog API: $CATALOG_URL"
echo "Cart API: $CART_URL"
echo "Orders API: $ORDERS_URL"
echo "Checkout API: $CHECKOUT_URL"
echo ""
echo "🔍 To monitor your services:"
echo "aws ecs list-services --cluster retail-ui-cluster --region $AWS_REGION"
echo "aws ecs describe-services --cluster retail-ui-cluster --services retail-ui-service --region $AWS_REGION"
echo ""
echo "🗑️  To clean up resources:"
echo "./cleanup-retail-store.sh"