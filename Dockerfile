# Use Python 3.11 slim (More stable wheels than 3.13)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# gcc and python3-dev are needed for building some python packages from source
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements FIRST to leverage Docker cache
COPY requirements.txt .

# Install dependencies (no cache to save space)
RUN pip install --no-cache-dir -r requirements.txt

# Copy necessary source code
# We only need services folder and maybe config? No, config is TS.
# We copy everything not ignored by .dockerignore (which excludes *.ts, node_modules)
COPY . .

# Create projects directory if it doesn't exist
RUN mkdir -p projects

# Expose the port Railway uses
ENV PORT=8000
EXPOSE $PORT

# Start the Bridge
# Shell form allows proper variable expansion of $PORT
CMD uvicorn services.bridge:app --host 0.0.0.0 --port $PORT

