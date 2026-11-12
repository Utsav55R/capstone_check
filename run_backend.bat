@echo off
echo ===================================================================
echo Starting SMART PLACED AI - Backend API Layer (FastAPI)
echo Course DSN4091 - Capstone Project Phase 1 - Review 1
echo ===================================================================
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
