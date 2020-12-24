# balena-electron-env

This is work in progress

## What

Provides stuff that may be missing when running electron apps in kiosk mode
(with no desktop environment):
 * a wifi configuration dialog
 * a file picker
 * an on-screen keyboard (onboard)
 * a dialog for mounting / umounting removable drives

## Building

 Build and upload this project's docker images `./image-builder.sh`;

## Using

 * In your electron app project create a Dockerfile that uses this
 project: `FROM balenablocks/aarch64-balena-electron-env`,
 replace `aarch64` with the architecture you need (`aarch64`, `armv7hf` or `amd64`);
 * Put your electron app in `/usr/src/app` in this Dockerfile.

This works by running a window manager (`metacity` for now), `dbus`, an
on-screen keyboard (`onboard`) and requiring some js code before your
application.

The required js code replaces the file picker, adds buttons for opening the
additional dialogs and injects some javascript in each window to summon the
on-screen keyboard when an input is focused.

## Components

### Wifi configuration

Works by communicating with NetworkManager via DBus.

### File picker

Replaces the default electron gtk file picker, can be constrained with
`BALENAELECTRONJS_CONSTRAINT_PATH`.

### On-screen keyboard

`onboard` is summoned via the session dbus each time an input is focused.

### Mounting / umounting of removable drives

Watches and allows to mount / umount removable drives in
`BALENAELECTRONJS_MOUNTS_ROOT`.

## Environment variables:

| Name | Description | Default Value |
| ---- | ----------- | ------------- |
| `BALENAELECTRONJS_MOUNTS_ROOT` | Where the removable drives should be mounted| `/tmp/media` |
| `BALENAELECTRONJS_CONSTRAINT_PATH` | Only files in this path will be accessible through the file picker |  |
| `BALENAELECTRONJS_OVERLAY_DELAY` | Delay before showing the overlay icons | `200` |
| `BALENAELECTRONJS_REMOTE_DEBUGGING_PORT` | Enable electron remote debugging on this port |  |
| `BALENAELECTRONJS_SLEEP_BUTTON_POSITION` | Sleep button position: x,y |  |
| `BALENAELECTRONJS_WIFI_BUTTON_POSITION` | Wifi button position: x,y |  |
| `BALENAELECTRONJS_SETTINGS_BUTTON_POSITION` | Settings button position: x,y |  |
| `BALENAELECTRONJS_MOUNTS_BUTTON_POSITION` | Mounts button position: x,y |  |
| `BALENAELECTRONJS_SCREENSAVER_ON_COMMAND` | Shell command to run when the screensaver is turned on |  |
| `BALENAELECTRONJS_SCREENSAVER_OFF_COMMAND` | Shell command to run when the screensaver is turned off |  |
| `BALENAELECTRONJS_UPDATES_ONLY_DURING_SCREENSAVER` | Only allows application updates to happen while the screensaver is on if set |  |
| `BALENAELECTRONJS_SCREENSAVER_DELAY_OVERRIDE` | Overrides the screensaver delay from the settings: number in minutes or 'never' |  |
| `BALENAELECTRONJS_ZOOM_FACTOR` | Zoom factor for overlay windows size and position | `1` |
| `DBUS_SYSTEM_BUS_ADDRESS` | DBus address for communicating with NetworkManager | `unix:path=/host/run/dbus/system_bus_socket` |
| `XRANDR_ARGS` | Rotate the screen with `xrandr $XRANDR_ARGS`, example: "-o inverted -x" |  |

## Remote methods:

Call them with `electron.ipcRenderer.invoke(methodName, ...parameters)` from any renderer process.

| Name | Parameters | Description |
| ---- | ---------- | ----------- |
| `mount-drive` | `drivePath: string` | Mounts all partitions of the drive, `drivePath` is the name of the drive in `/dev/disk/by-path/` |
| `disable-screensaver` | | Disables the screensaver, does not change the `sleepDelay` setting |
| `enable-screensaver` | | Enables the screensaver, does not change the `sleepDelay` setting |


## Utilities

 * [clickclock](https://github.com/zpfvo/clicklock) is available in `/usr/bin/clicklock`
