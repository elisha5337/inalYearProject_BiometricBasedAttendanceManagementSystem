FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      cmake \
      libgl1 \
      libglib2.0-0 \
      libsm6 \
      libxext6 \
      libxrender1 \
      pkg-config \
      git && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=hu_attendance_system.settings

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "hu_attendance_system.wsgi:application"]
