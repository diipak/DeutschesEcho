#!/bin/bash
cd /Users/deepakbatham/Documents/DocsN_all/Project/DeutschesAiTutor/AI-Tutor

echo "🚀 Starting AI-Tutor Backend..."
source .venv/bin/activate

# Use nohup to run it in the background so terminal can be closed
nohup python3 -m backend.main > backend.log 2>&1 &

echo "✅ Backend is running in the background."
echo "🔗 Tailscale is already serving this to your tailnet."
echo "To stop it, you can run: pkill -f 'python3 -m backend.main'"
