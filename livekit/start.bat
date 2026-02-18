@echo off
title LiveKit SFU Server
color 0a

:start
cls
livekit-server.exe --config livekitXXX.yaml
pause
goto start