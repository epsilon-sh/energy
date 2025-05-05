ARG VERSION_NODE
FROM imbios/bun-node:latest-${VERSION_NODE}-alpine

RUN apk add --no-cache build-base python3 sqlite-libs sqlite-dev

RUN npm i -g node-gyp sqlite3
RUN cd /usr/local/lib/node_modules/sqlite3/ && npm run rebuild
