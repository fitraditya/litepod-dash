FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    STORAGE_TYPE=local \
    STORAGE_LOCAL_PATH=/data
COPY --from=build /app/.output ./.output
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3000
# AUTH_PASSWORD and SESSION_SECRET (>=32 chars) must be supplied at run time (-e / --env-file);
# the server refuses to start without them.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]
