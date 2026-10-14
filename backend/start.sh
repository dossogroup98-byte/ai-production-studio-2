#!/usr/bin/env bash
set -e

export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

echo "Starting AI Production Studio Backend..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 8011 --reload
