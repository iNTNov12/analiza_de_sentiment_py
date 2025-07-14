#!/bin/bash
# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Download NLTK data
python -m nltk.downloader vader_lexicon stopwords
