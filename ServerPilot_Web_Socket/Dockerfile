# syntax=docker/dockerfile:1

FROM python:3.11.13-slim-trixie AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       openssh-client \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt ./

# Pin tooling versions to satisfy hadolint DL3013 and ensure reproducibility
RUN pip3 install --no-cache-dir \
        pip==24.2 \
        setuptools==70.3.0 \
        wheel==0.44.0 \
    && pip3 install --no-cache-dir -r requirements.txt

COPY . .

ENV ALLOWED_ORIGINS="*" \
    JWT_ALGORITHM="HS256" \
    MAX_REQS_PER_MINUTE="30" \
    MAX_CONCURRENT_CONNECTIONS_PER_SERVER="3" \
    WEBSOCKET_PING_INTERVAL="20"

USER app

EXPOSE 5000

CMD ["sh", "-c", "uvicorn ws_server:app --host 0.0.0.0 --port ${PORT:-5000}"]