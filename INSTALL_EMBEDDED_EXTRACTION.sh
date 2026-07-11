#!/bin/bash

echo "================================================"
echo "🚀 Installing Embedded Image Extraction Feature"
echo "================================================"
echo ""

# Navigate to backend
cd backend

echo "📦 Installing pdf-lib package..."
npm install pdf-lib

echo ""
echo "✅ Installation complete!"
echo ""
echo "================================================"
echo "🎯 Next Steps"
echo "================================================"
echo ""
echo "1. If using Docker, rebuild:"
echo "   docker-compose down"
echo "   docker-compose build backend"
echo "   docker-compose up -d"
echo ""
echo "2. If running locally, restart backend:"
echo "   npm start"
echo ""
echo "3. Upload a PDF and watch the logs!"
echo ""
echo "================================================"
echo "📖 Read EMBEDDED_IMAGE_EXTRACTION.md for details"
echo "================================================"

