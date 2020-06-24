#!/bin/sh

if [ -n "$XRANDR_ROTATION" ]; then
	xrandr -o $XRANDR_ROTATION
fi

metacity &
dbus-daemon --fork --session --address $DBUS_SESSION_BUS_ADDRESS
/usr/src/app/node_modules/.bin/electron --no-sandbox -r /usr/lib/balena-electronjs /usr/src/app
