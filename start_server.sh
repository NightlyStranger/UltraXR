#!/bin/bash

# Serve the current directory
serve -s . -l 8080 &
SERVE_PID=$!
sleep 2

# Start ngrok
"/c/Users/schoo/Desktop/bachelor/helloThree/ngrok.exe" http 8080 > /dev/null &
NGROK_PID=$!
sleep 5

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https:[^"]*' | cut -d\" -f4)

if [ -z "$NGROK_URL" ]; then
  echo "❌ Failed to retrieve ngrok URL."
  kill $SERVE_PID $NGROK_PID
  exit 1
fi

echo "🌍 Your site is live at: $NGROK_URL"
echo "🛑 Press Ctrl+C to stop the servers."

wait $SERVE_PID $NGROK_PID