#!/bin/bash

# Setup script for Image Extraction Feature
# This script installs dependencies and creates necessary directories

echo "🖼️  Setting up Image Extraction Feature..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Navigate to backend directory
cd backend

echo "📦 Installing required npm packages..."
echo "   - pdf-img-convert (PDF to image conversion)"
echo "   - sharp (Image processing and optimization)"
echo ""

npm install pdf-img-convert sharp

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "📁 Creating extracted-images directory..."

# Create extracted-images directory if it doesn't exist
mkdir -p uploads/extracted-images

if [ -d "uploads/extracted-images" ]; then
    echo "✅ Directory created: backend/uploads/extracted-images/"
else
    echo "❌ Failed to create directory"
    exit 1
fi

# Set appropriate permissions
chmod 755 uploads/extracted-images

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Upload a PDF with figures/images"
echo "3. Check console logs for image extraction messages"
echo "4. View flashcards to see associated images"
echo ""
echo "📖 See IMAGE_EXTRACTION_FEATURE.md for detailed documentation"
echo ""

