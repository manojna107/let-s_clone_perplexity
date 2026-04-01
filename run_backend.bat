@echo off
title Perplexity Clone - Gemini Backend
echo.
echo ================================================
echo  Installing dependencies...
echo ================================================
pip install fastapi uvicorn google-genai pydantic
echo.
echo ================================================
echo  Starting server...
echo  Open: http://localhost:8000
echo ================================================
echo.
python main.py
pause
