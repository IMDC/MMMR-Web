FROM node:20-alpine

# FFmpeg is required for audio extraction from video files
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 5001

CMD ["npx", "tsx", "src/index.ts"]
