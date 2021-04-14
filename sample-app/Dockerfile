FROM balena-electron-env

COPY package.json package-lock.json ./
RUN npm i --production
RUN npm i electron
COPY index.js index.html renderer.js ./
