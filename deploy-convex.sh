#!/bin/bash
# Eldoria AI - Convex Deployment Script

echo "🚀 Deploying Convex functions..."

# Check if Convex is installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx is required. Install Node.js first."
    exit 1
fi

# Install Convex if needed
if ! command -v convex &> /dev/null; then
    echo "📦 Installing Convex..."
    npm install convex
fi

# Deploy to Convex
echo "🚀 Deploying to Convex..."
npx convex deploy

echo "✅ Convex deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Push to GitHub to trigger Railway deployment"
echo "2. Or manually redeploy on Railway"
