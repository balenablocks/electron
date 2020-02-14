#!/bin/sh

if [ -n "$VNC_PASSWORD" ]; then
	x11vnc -passwd $VNC_PASSWORD -display $DISPLAY -noxdamage -forever &
fi

metacity &
dbus-daemon --fork --session --address $DBUS_SESSION_BUS_ADDRESS
/usr/src/app/node_modules/.bin/electron --no-sandbox -r /usr/lib/balena-electronjs /usr/src/app
