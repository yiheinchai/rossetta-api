from setuptools import setup, find_packages
import os

setup(
    name="rossetta-fastapi",
    version="1.0.0",
    description="Zero-config network request obfuscation middleware for FastAPI",
    long_description=open("README.md").read() if os.path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    author="",
    author_email="",
    url="https://github.com/yiheinchai/rossetta-api",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.100.0",
        "cryptography>=41.0.0",
        "python-multipart>=0.0.6"
    ],
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    keywords="fastapi middleware encryption obfuscation security rossetta",
    license="MIT",
)
