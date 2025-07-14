#!/bin/bash
set -e

# Install system dependencies
apt-get update
apt-get install -y python3-dev python3-pip python3-venv

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip and setuptools
pip install --upgrade pip setuptools wheel

# Install build dependencies
pip install numpy==1.24.4
pip install Cython==3.0.0

# Install remaining requirements
pip install -r requirements.txt

# Make sure the script is executable
chmod +x build.sh
