#!/bin/bash

echo "=========================================="
echo "Real-Time Chat App - Complete Setup"
echo "=========================================="
echo ""

echo "1️⃣  Starting MongoDB..."
docker-compose up -d
echo "✅ MongoDB started on localhost:27017"
echo ""

echo "2️⃣  Starting Backend Server..."
cd backend &
npm run dev &
BACKEND_PID=$!
echo "✅ Backend starting on port 5000"
echo ""

echo "3️⃣  Starting Frontend Server..."
cd ../frontend &
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend starting on port 3000"
echo ""

echo "=========================================="
echo "🎉 All services started!"
echo "=========================================="
echo ""
echo "📱 Open browser: http://localhost:3000"
echo ""
echo "To stop all services:"
echo "  - Kill backend: kill $BACKEND_PID"
echo "  - Kill frontend: kill $FRONTEND_PID"
echo "  - Stop MongoDB: docker-compose down"
echo ""
