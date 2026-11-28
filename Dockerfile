FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev \
    binutils \
    pkgconfig \
    git \
    ffmpeg
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 10000
CMD ["node", "bot.js"]
