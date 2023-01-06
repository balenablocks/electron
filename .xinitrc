#!/bin/sh

# if [ -n "$XRANDR_ARGS" ]; then
# 	xrandr $XRANDR_ARGS
# fi

# REMOTE_DEBUG=""
# if [ -n "$BALENAELECTRONJS_REMOTE_DEBUGGING_PORT" ]; then
# 	LOCAL_PORT=`expr $BALENAELECTRONJS_REMOTE_DEBUGGING_PORT - 1`
# 	REMOTE_DEBUG="--remote-debugging-port=$LOCAL_PORT"
# 	# --remote-debugging-port only listens on 127.0.0.1 so we set up a proxy listening on all interfaces
# 	simpleproxy -d -L $BALENAELECTRONJS_REMOTE_DEBUGGING_PORT -R 127.0.0.1:$LOCAL_PORT
# fi

metacity &
dbus-daemon --fork --session --address $DBUS_SESSION_BUS_ADDRESS 
/usr/src/app/node_modules/.bin/electron $REMOTE_DEBUG --no-sandbox -r /usr/lib/balena-electron-env /usr/src/app
