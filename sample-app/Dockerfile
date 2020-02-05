FROM balena-electronjs

COPY package.json package-lock.json ./
RUN npm i --production
RUN npm i electron
COPY index.js index.html renderer.js ./

ENV VNC_PASSWORD=secret
