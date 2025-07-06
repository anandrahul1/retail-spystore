#!/bin/bash

# Retail Store Sample App Cleanup Script
# This script removes all AWS resources created for the retail store application

set -e

AWS_REGION=${AWS_REGION:-us-east-1}

echo "🗑️  Starting cleanup of Retail Store Sample App resources..."
echo "Region: $AWS_REGION"

# Function to delete stack if it exists
delete_stack_if_exists() {
    if aws cloudformation describe-stacks --stack-name "$1" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "Deleting stack: $1"
        aws cloudformation delete-stack --stack-name "$1" --region "$AWS_REGION"
        echo "⏳ Waiting for stack $1 to be deleted..."
        aws cloudformation wait stack-delete-complete --stack-name "$1" --region "$AWS_REGION"
        echo "✅ Stack $1 deleted successfully"
    else
        echo "Stack $1 does not exist, skipping..."
    fi
}

# Delete ECS stacks first (in reverse order)
echo "🔄 Step 1: Deleting ECS services..."
services=("ui" "checkout" "orders" "cart" "catalog")

for service in "${services[@]}"; do
    delete_stack_if_exists "retail-$service-ecs"
done

# Delete ECR repositories
echo "🔄 Step 2: Deleting ECR repositories..."
for service in "${services[@]}"; do
    delete_stack_if_exists "retail-$service-ecr"
done

# Delete shared infrastructure last
echo "🔄 Step 3: Deleting shared infrastructure..."
delete_stack_if_exists "retail-store-shared"

echo "🎉 Cleanup completed successfully!"
echo "All Retail Store Sample App resources have been removed from AWS."