from setuptools import setup, find_packages

setup(
    name="analiza-sentiment",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "Flask==2.3.3",
        "Flask-Cors==4.0.0",
        "pandas==2.0.3",
        "numpy==1.24.4",
        "scikit-learn==1.3.0",
        "nltk==3.8.1",
        "tweepy==4.14.0",
        "python-dotenv==1.0.0",
        "plotly==5.15.0",
        "dash==2.11.1",
        "dash-bootstrap-components==1.4.1",
        "wordcloud==1.9.2",
        "gunicorn==21.2.0"
    ],
    python_requires=">=3.9",
)
