from setuptools import setup, find_packages

setup(
    name="ada-dnd-assistant",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "openai>=1.0.0",
        "pydantic>=2.0.0",
        "python-dotenv>=1.0.0",
    ],
    python_requires=">=3.8",
    description="ADA - AI D&D Assistant with Narrative-to-Mechanics Translation",
    author="ADA Team",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: End Users/Desktop",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)
