FROM balenalib/amd64-debian-node:12.6-buster-build as builder
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm i
COPY tsconfig.webpack.json tsconfig.json webpack.config.ts ./
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
		# emojis (used on the wifi config page)
		fonts-symbola \
		# mount ntfs partitions
		ntfs-3g \
		# might be useful
		jq \
		# for exposing --remote-debugging-port to other computers
		simpleproxy \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/src/app/build /usr/lib/balena-electronjs
COPY .xserverrc /root/.xserverrc
COPY .xinitrc /root/.xinitrc

ENV DISPLAY=:0
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

WORKDIR /usr/src/app

CMD xinit
