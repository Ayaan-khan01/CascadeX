#!/usr/bin/env bash
# CascadeX — Unified Start Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo " Starting CascadeX — Urban Infrastructure Simulator"
echo "========================================================"

# Trap SIGINT/SIGTERM to cleanly kill child processes
cleanup() {
    echo ""
    echo "Stopping CascadeX servers..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start Backend
echo "-> Launching FastAPI Backend on http://127.0.0.1:8000..."
cd "$DIR/backend"
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Wait for backend health
until curl -s http://127.0.0.1:8000/api/health > /dev/null; do
    sleep 0.5
done
echo "✓ Backend is healthy and operational."

# Start Frontend
echo "-> Launching Frontend Dev Server on http://localhost:5173..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================================"
echo " CascadeX is running!"
echo " Open your browser to: http://localhost:5173"
echo " Backend API docs:     http://127.0.0.1:8000/docs"
echo " Press Ctrl+C to stop all servers."
echo "========================================================"
echo ""

wait
