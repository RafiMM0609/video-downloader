# ==========================================
# Dockerfile: UnduhVideo (Nuxt 3 + yt-dlp + ffmpeg)
# ==========================================

FROM node:22-bookworm-slim AS base

# Install system dependencies (ffmpeg, python3, curl, ca-certificates)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp official release
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Nuxt production output
ENV NODE_ENV=production
RUN npm run build

# Prepare download directory
RUN mkdir -p /app/downloads && chmod 777 /app/downloads

# Environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DOWNLOAD_DIR=/app/downloads
ENV YTDL_PATH=/usr/local/bin/yt-dlp
ENV FFMPEG_PATH=/usr/bin/ffmpeg

EXPOSE 3000

# Start Nuxt Nitro server
CMD ["node", ".output/server/index.mjs"]
