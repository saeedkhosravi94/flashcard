#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Flashcard Admin User Creation${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Prompt for email
read -p "Enter admin email: " ADMIN_EMAIL
if [ -z "$ADMIN_EMAIL" ]; then
    echo -e "${RED}❌ Email cannot be empty${NC}"
    exit 1
fi

# Prompt for username
read -p "Enter admin username: " ADMIN_USERNAME
if [ -z "$ADMIN_USERNAME" ]; then
    echo -e "${RED}❌ Username cannot be empty${NC}"
    exit 1
fi

# Prompt for password (hidden input)
read -s -p "Enter admin password: " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}❌ Password cannot be empty${NC}"
    exit 1
fi

# Confirm password
read -s -p "Confirm admin password: " ADMIN_PASSWORD_CONFIRM
echo ""
if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
    echo -e "${RED}❌ Passwords do not match${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Creating admin user...${NC}"

# Create a temporary Node.js script
cat > /tmp/create_admin_temp.js << EOF
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/flashcard');
    console.log('✅ Connected to MongoDB');

    const existingAdmin = await Admin.findOne({ 
      \$or: [
        { username: '${ADMIN_USERNAME}' },
        { email: '${ADMIN_EMAIL}' }
      ]
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user with this username or email already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      process.exit(1);
    }

    const admin = new Admin({
      username: '${ADMIN_USERNAME}',
      email: '${ADMIN_EMAIL}',
      password: '${ADMIN_PASSWORD}',
      role: 'superadmin'
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('========================================');
    console.log('Admin Credentials:');
    console.log('Username: ${ADMIN_USERNAME}');
    console.log('Email: ${ADMIN_EMAIL}');
    console.log('========================================');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
EOF

# Detect backend container name
BACKEND_CONTAINER=""
if docker ps --format '{{.Names}}' | grep -q "flashcard-backend-prod"; then
    BACKEND_CONTAINER="flashcard-backend-prod"
elif docker ps --format '{{.Names}}' | grep -q "flashcard-backend"; then
    BACKEND_CONTAINER="flashcard-backend"
else
    echo -e "${RED}❌ Backend container not found!${NC}"
    echo -e "${YELLOW}Please make sure the backend container is running.${NC}"
    echo -e "${YELLOW}Available containers:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

echo -e "${YELLOW}Using backend container: ${BACKEND_CONTAINER}${NC}"

# Copy script to backend container and execute
docker cp /tmp/create_admin_temp.js ${BACKEND_CONTAINER}:/app/create_admin_temp.js
docker exec -i ${BACKEND_CONTAINER} node create_admin_temp.js
RESULT=$?

# Cleanup
docker exec ${BACKEND_CONTAINER} rm -f create_admin_temp.js

# Cleanup temp file
rm -f /tmp/create_admin_temp.js

if [ $RESULT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Admin user created successfully!${NC}"
    echo -e "${GREEN}You can now login at: /admin/login${NC}"
else
    echo ""
    echo -e "${RED}❌ Failed to create admin user${NC}"
    exit 1
fi

