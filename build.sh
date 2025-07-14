#!/bin/bash
set -e

# Install system dependencies
apt-get update
apt-get install -y python3.10-dev python3.10-venv python3-pip

# Create and activate virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Upgrade pip and setuptools
python -m pip install --upgrade pip setuptools wheel

# Install build dependencies first
python -m pip install numpy==1.24.4
python -m pip install Cython==0.29.36

# Install remaining requirements
python -m pip install -r requirements.txt

# Download NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('vader_lexicon')"
