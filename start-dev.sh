#!/bin/bash
# Development startup script for Smart PDS System

echo "🚀 Starting Smart PDS Development Environment..."

# Check if MongoDB is running
if ! docker ps | grep -q mongodb; then
    echo "📦 Starting MongoDB..."
    docker start mongodb 2>/dev/null || docker run -d --name mongodb -p 27017:27017 mongo:latest
    sleep 3
fi

# Start backend
echo "⚙️  Starting Backend Server..."
cd backend
node server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
cd ..

# Wait for backend to initialize
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start frontend
echo "🎨 Starting Frontend Dev Server..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
cd ..

echo ""
echo "✅ Smart PDS is running!"
echo ""
echo "📊 Backend:  https://localhost:5000"
echo "🌐 Frontend: https://localhost:5173"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend/backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop: pkill -f 'node server.js' && pkill -f 'vite'"
