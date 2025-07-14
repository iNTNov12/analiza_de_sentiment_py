#!/bin/bash
# Exit on error
set -e

# Print environment information
echo "=== System Information ==="
uname -a
echo "Python versions available:"
which python3.9 || echo "Python 3.9 not found"
python3.9 --version || echo "Python 3.9 not available"

echo "=== Installing system dependencies ==="
sudo apt-get update
sudo apt-get install -y python3.9 python3.9-venv python3.9-dev

# Create and activate virtual environment
echo "=== Setting up virtual environment ==="
python3.9 -m venv .venv
source .venv/bin/activate

# Upgrade pip and setuptools
echo "=== Upgrading pip and setuptools ==="
python -m pip install --upgrade pip setuptools wheel

# Install build tools
echo "=== Installing build tools ==="
pip install --no-cache-dir build

# Install requirements
echo "=== Installing requirements ==="
pip install --no-cache-dir -r requirements.txt

# Download NLTK data
echo "=== Downloading NLTK data ==="
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('stopwords')"

echo "=== Build completed successfully! ==="
