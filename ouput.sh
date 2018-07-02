#! /bin/bash
PID=$(pgrep node)
sudo tail -f /proc/$PID/fd/1
