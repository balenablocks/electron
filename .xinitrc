#!/bin/sh

if [ -n "$XRANDR_ROTATION" ]; then
	xrandr -o $XRANDR_ROTATION
fi

REMOTE_DEBUG=""
if [ -n "$BALENAELECTRONJS_REMOTE_DEBUGGING_PORT" ]; then
	REMOTE_DEBUG="--remote-debugging-port=$BALENAELECTRONJS_REMOTE_DEBUGGING_PORT"
fi

metacity &
dbus-daemon --fork --session --address $DBUS_SESSION_BUS_ADDRESS
/usr/src/app/node_modules/.bin/electron $REMOTE_DEBUG --no-sandbox -r /usr/lib/balena-electronjs /usr/src/app
