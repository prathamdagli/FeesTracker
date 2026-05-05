@echo off
echo Starting LearnersZone Services...

cd backend
start cmd /k "echo Starting Backend Server... && npm run dev"

cd ../frontend
start cmd /k "echo Starting Frontend Server... && npm run dev"

echo Both servers are starting up in separate windows!
pause
