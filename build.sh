#!/bin/bash
# Exit on error
set -e

# Ensure we're using Python 3.9
echo "Checking Python version..."
python --version

# Install build dependencies first
echo "Installing build dependencies..."
python -m pip install --upgrade pip setuptools wheel build

# Install runtime dependencies
echo "Installing application dependencies..."
pip install --no-cache-dir -r requirements.txt

# Download NLTK data
echo "Downloading NLTK data..."
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('stopwords')"

echo "Build completed successfully!"
