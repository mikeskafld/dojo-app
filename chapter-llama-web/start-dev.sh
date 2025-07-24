#!/bin/bash

# Chapter-Llama Web Development Startup Script

echo "🚀 Starting Chapter-Llama Web Application..."

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the chapter-llama-web directory"
    exit 1
fi

# Start Flask backend in background
echo "📡 Starting Flask backend on port 5328..."
cd backend
python app.py &
BACKEND_PID=$!
cd ..

# Give backend time to start
sleep 3

# Start Next.js frontend
echo "🌐 Starting Next.js frontend on port 3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Application started successfully!"
echo "�� Frontend: http://localhost:3000"
echo "📡 Backend: http://localhost:5328"
echo ""
echo "Press Ctrl+C to stop both services"

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for processes
wait
