#!/bin/bash
# Exit on error
set -e

# Install Python dependencies
echo "Installing Python dependencies..."
python -m pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt

# Download NLTK data
echo "Downloading NLTK data..."
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('stopwords')"
