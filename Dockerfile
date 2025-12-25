# Use Python 3.13 slim image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies (optional, but good practice for slim images)
# bridge.py checks for tkinter (we don't need it on headless), but we might need gcc for some wheels.
# Using standard defaults.

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
# Using host 0.0.0.0 is critical for Docker networking
CMD ["sh", "-c", "uvicorn services.bridge:app --host 0.0.0.0 --port $PORT"]
