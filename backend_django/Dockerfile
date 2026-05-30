FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies for OpenCV and AI models
#RUN apt-get update && apt-get install -y \
#    libgl1-mesa-glx \
#    libglib2.0-0 \
#    libsm6 \
#    libxext6 \
#    libxrender-dev \
#    build-essential \
#    && rm -rf /var/lib/apt/lists/*
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

# Now install your requirements
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt


WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

CMD ["gunicorn", "--bind", "0.0.0.0:10000", "hu_attendance_system.wsgi:application"]