#!/bin/bash

echo "🔍 Checking AI Interview Application Status..."
echo "=============================================="

# Check Backend
echo "📡 Backend Server (Port 5000):"
if curl -s http://localhost:5000/api/auth/me > /dev/null; then
    echo "✅ Backend is running and responding"
else
    echo "❌ Backend is not responding"
fi

# Check Frontend
echo "🌐 Frontend Server (Port 3000):"
if curl -s -I http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running and responding"
else
    echo "❌ Frontend is not responding"
fi

echo ""
echo "🎯 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo ""
echo "🚀 Ready to use! Open http://localhost:3000 in your browser."
