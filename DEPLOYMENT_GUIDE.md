# Retail Store Sample App - AWS Deployment Guide

This guide will help you deploy the retail store sample application to AWS using ECS Fargate, RDS MySQL (micro), DynamoDB, and SQS.

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. Docker installed and running
3. Sufficient AWS permissions for ECS, RDS, DynamoDB, VPC, IAM

## Architecture Overview

- **Frontend**: UI service (Java Spring Boot)
- **Backend Services**: 
  - Catalog service (Go) → RDS MySQL
  - Cart service (Java) → DynamoDB
  - Orders service (Java) → RDS PostgreSQL + SQS
  - Checkout service (Node.js) → In-memory (POC)
- **Infrastructure**: ECS Fargate, Application Load Balancer, VPC

## Quick Deployment (Automated)

```bash
# Set environment variables
export AWS_REGION=us-east-1
export DB_PASSWORD=RetailStore123!

# Run the deployment script
./deploy-retail-store.sh
```

## Manual Deployment Steps

### Step 1: Deploy Shared Infrastructure

```bash
aws cloudformation deploy \
    --template-file cloudformation-templates/retail-store-shared-infrastructure.json \
    --stack-name retail-store-shared \
    --parameter-overrides DBPassword=RetailStore123! \
    --capabilities CAPABILITY_IAM \
    --region us-east-1
```

### Step 2: Create ECR Repositories

```bash
# Create ECR repositories for each service
services=("catalog" "cart" "orders" "checkout" "ui")

for service in "${services[@]}"; do
    aws cloudformation deploy \
        --template-file "src/$service/cloudformation-templates/retail-$service-ecr-infrastructure.json" \
        --stack-name "retail-$service-ecr" \
        --capabilities CAPABILITY_IAM \
        --region us-east-1
done
```

### Step 3: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# For each service, build and push
for service in "${services[@]}"; do
    ECR_URI=$(aws cloudformation describe-stacks --stack-name "retail-$service-ecr" --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' --output text)
    
    cd "src/$service"
    docker build -t "retail-$service:latest" .
    docker tag "retail-$service:latest" "$ECR_URI:latest"
    docker push "$ECR_URI:latest"
    cd ../..
done
```

### Step 4: Deploy ECS Services

Deploy each service using their respective CloudFormation templates with the ECR image URIs.

## Configuration Details

### Database Configuration

- **Catalog Service**: MySQL 8.0.35 on RDS (db.t3.micro)
- **Orders Service**: PostgreSQL 16.1 on RDS (db.t3.micro)
- **Cart Service**: DynamoDB (Pay-per-request)

### Service Configuration

- **All services**: ECS Fargate with Application Load Balancer
- **CPU/Memory**: 
  - UI: 512 CPU, 1024 MB memory
  - Backend services: 256 CPU, 512 MB memory
- **Auto Scaling**: Configured for 1-3 tasks per service

### Environment Variables

Each service requires specific environment variables for database connections:

- `RETAIL_CATALOG_PERSISTENCE_PROVIDER=mysql`
- `RETAIL_CATALOG_PERSISTENCE_ENDPOINT=<rds-endpoint>:3306`
- `RETAIL_ORDERS_PERSISTENCE_PROVIDER=postgres`
- `RETAIL_CART_PERSISTENCE_PROVIDER=dynamodb`

## Accessing the Application

After deployment, you can access:

- **Frontend UI**: `http://<ui-alb-dns-name>`
- **Catalog API**: `http://<catalog-alb-dns-name>/products`
- **Cart API**: `http://<cart-alb-dns-name>/carts`
- **Orders API**: `http://<orders-alb-dns-name>/orders`
- **Checkout API**: `http://<checkout-alb-dns-name>/checkout`

## Monitoring

- **CloudWatch Logs**: All services log to CloudWatch
- **ECS Console**: Monitor service health and scaling
- **RDS Console**: Monitor database performance
- **DynamoDB Console**: Monitor table metrics

## Cost Optimization for POC

- RDS instances use `db.t3.micro` (free tier eligible)
- DynamoDB uses pay-per-request billing
- ECS Fargate with minimal CPU/memory allocation
- No Multi-AZ deployment for databases
- No backup retention for RDS (POC only)

## Cleanup

To remove all resources:

```bash
./cleanup-retail-store.sh
```

Or manually delete CloudFormation stacks in reverse order:
1. ECS service stacks
2. ECR repository stacks  
3. Shared infrastructure stack

## Troubleshooting

### Common Issues

1. **Docker build failures**: Ensure Docker is running and you have sufficient disk space
2. **ECR push failures**: Verify AWS credentials and ECR login
3. **Database connection issues**: Check security groups and database endpoints
4. **Service startup failures**: Check CloudWatch logs for detailed error messages

### Useful Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster <cluster-name> --services <service-name>

# View CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix /ecs/retail

# Check RDS status
aws rds describe-db-instances --db-instance-identifier retail-catalog-db
```

## Security Considerations

This is a POC deployment with minimal security:
- Databases are in private subnets
- Security groups restrict access between services
- No SSL/TLS termination (add ACM certificate for production)
- Default passwords (change for production)
- No WAF or advanced security features

For production deployment, consider:
- SSL/TLS certificates
- WAF protection
- Secrets Manager for database passwords
- VPC endpoints for AWS services
- Enhanced monitoring and alerting