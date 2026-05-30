 FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Force pip to use an older, more permissive version of cmake for building
RUN pip install --no-cache-dir "cmake<=3.25.0"

# 1. Set the working directory FIRST
WORKDIR /app

# 2. Copy the requirements file into /app
COPY requirements.txt /app/

# 3. Install the dependencies inside /app
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy the rest of your backend project files
COPY . /app/

# 5. Start the server
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "hu_attendance_system.wsgi:application"]