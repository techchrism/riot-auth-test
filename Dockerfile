# Builder
FROM node:20.11-bookworm-slim as builder
USER node
WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run build

# Runner
FROM node:20.11-bookworm-slim
ENV NODE_ENV production
USER node
WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
CMD ["node", "."]