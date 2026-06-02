#!/bin/bash

echo "================================================"
echo "Real-Time Chat Application - Quick Start"
echo "================================================"
echo ""

# Install backend
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"
echo ""

# Install frontend
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed"
echo ""

echo "================================================"
echo "✨ Setup complete!"
echo "================================================"
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 - Backend (from backend folder):"
echo "  npm run dev"
echo ""
echo "Terminal 2 - Frontend (from frontend folder):"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "Default test credentials:"
echo "  Email: test@example.com"
echo "  Password: test123"
echo ""
