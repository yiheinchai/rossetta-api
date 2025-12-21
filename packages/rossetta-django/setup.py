from setuptools import setup
import os

# Read the README file
with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="rossetta-django",
    version="0.1.0",
    description="Zero-config network request obfuscation middleware for Django - protect your APIs from reverse engineering",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Rossetta API Team",
    author_email="",
    url="https://github.com/yiheinchai/rossetta-api",
    project_urls={
        "Bug Tracker": "https://github.com/yiheinchai/rossetta-api/issues",
        "Documentation": "https://github.com/yiheinchai/rossetta-api#readme",
        "Source Code": "https://github.com/yiheinchai/rossetta-api/tree/main/packages/rossetta-django",
    },
    py_modules=["rossetta_django"],
    install_requires=[
        "Django>=3.2",
        "cryptography>=41.0.0",
    ],
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Framework :: Django",
        "Framework :: Django :: 3.2",
        "Framework :: Django :: 4.0",
        "Framework :: Django :: 4.1",
        "Framework :: Django :: 4.2",
        "Framework :: Django :: 5.0",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Security :: Cryptography",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.8",
    keywords="django middleware encryption obfuscation security rossetta api-security aes-256 hmac endpoint-obfuscation",
    license="MIT",
)
