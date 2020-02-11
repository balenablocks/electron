FROM balenalib/amd64-debian-node:12.6-buster-build as builder
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm i
COPY tsconfig.json webpack.config.js ./
COPY src src/
COPY typings typings/
RUN npm run build

FROM balenalib/amd64-debian-node:12.6-buster-run
RUN \
	apt-get update \
	&& apt-get install -y \
		# Electron runtime dependencies
		libasound2 \
		libgdk-pixbuf2.0-0 \
		libglib2.0-0 \
		libgtk-3-0 \
		libnss3 \
		libx11-xcb1 \
		libxss1 \
		libxtst6 \
		# Onscreen keyboard
		onboard \
		dconf-cli \
		metacity \
		# x11
		xserver-xorg \
		xinit \
		# includes xset
		x11-xserver-utils \
		# xvfb & vnc for development
		x11vnc \
		xvfb \
		# emojis (used on the wifi config page)
		fonts-symbola \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/src/app/build /usr/lib/balena-electronjs
COPY balena-electronjs-start /usr/bin/balena-electronjs-start
RUN chmod +x /usr/bin/balena-electronjs-start

ENV DISPLAY=:1
ENV DBUS_SESSION_BUS_ADDRESS="unix:path=/tmp/dbus-session-bus"
COPY onboard.ini ./
RUN \
	dbus-daemon --fork --session --address $DBUS_SESSION_BUS_ADDRESS \
	&& dconf load /org/onboard/ < onboard.ini \
	&& rm onboard.ini \
	# Remove onboard's "Snippets" button
	&& sed -i '/layer2/d' /usr/share/onboard/layouts/Compact.onboard

# Required for communicating with host's NetworkManager
ENV DBUS_SYSTEM_BUS_ADDRESS="unix:path=/host/run/dbus/system_bus_socket"
# Override this in your dockerfile or with -e
ENV XVFB_RESOLUTION=1366x768x24

WORKDIR /usr/src/app

CMD ["sh", "/usr/bin/balena-electronjs-start"]
