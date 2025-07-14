from setuptools import setup, find_packages

# Read requirements from requirements.txt
with open('requirements.txt') as f:
    requirements = f.read().splitlines()

setup(
    name="analiza-sentiment-energie",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=requirements,
    python_requires='>=3.9',  # Changed to 3.9 for better compatibility
)
