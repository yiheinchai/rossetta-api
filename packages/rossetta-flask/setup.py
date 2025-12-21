from setuptools import setup
import os

# Read the README file
with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="rossetta-flask",
    version="0.1.0",
    description="Zero-config network request obfuscation middleware for Flask - protect your APIs from reverse engineering",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Rossetta API Team",
    author_email="",
    url="https://github.com/yiheinchai/rossetta-api",
    project_urls={
        "Bug Tracker": "https://github.com/yiheinchai/rossetta-api/issues",
        "Documentation": "https://github.com/yiheinchai/rossetta-api#readme",
        "Source Code": "https://github.com/yiheinchai/rossetta-api/tree/main/packages/rossetta-flask",
    },
    py_modules=["rossetta_flask"],
    install_requires=[
        "flask>=2.0.0",
        "cryptography>=41.0.0",
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
        "Programming Language :: Python :: 3.12",
        "Framework :: Flask",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Security :: Cryptography",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.8",
    keywords="flask middleware encryption obfuscation security rossetta api-security aes-256 hmac endpoint-obfuscation",
    license="MIT",
)
