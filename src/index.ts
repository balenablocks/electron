import * as electron from 'electron';
import { env } from 'process';

import { listPartitionsOnce, mount } from './mounts';
import {
	focusScript,
	init as onScreenKeyboardInit,
} from './on-screen-keyboard';
import { init as openDialogInit } from './open-dialog';
import { init as screenSaverInit } from './screensaver';
import { Settings } from './settings/settings';
import { uiUrl } from './utils';

let initialized = false;

function init() {
	const originalBrowserWindow = electron.BrowserWindow;

	class BrowserWindow extends originalBrowserWindow {
		constructor(options: any) {
			// TODO
			super(options);
		}
	}

	function createOverlayButton(url: string, x: number, y: number) {
		const win = new BrowserWindow({
			show: false,
			focusable: false,
			frame: false,
			transparent: true,
			width: 48,
			height: 56,
			webPreferences: {
				nodeIntegration: true,
			},
			x,
			y,
		});
		// Prevent white flash
		win.on('ready-to-show', () => {
			win.show();
		});
		win.loadURL(url);
	}

	function createOverlayOpenButton(
		icon: string,
		opens: WindowName,
		x: number,
		y: number,
	) {
		createOverlayButton(
			uiUrl('open-window-overlay-icon', { icon, opens }),
			x,
			y,
		);
	}

	function createOverlaySleepButton(x: number, y: number) {
		createOverlayButton(uiUrl('sleep-overlay-icon', { icon: '💤' }), x, y);
	}

	function ready() {
		onScreenKeyboardInit(electron);
		const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
		// delay required in order to have transparent windows
		// https://github.com/electron/electron/issues/16809
		const delay = env.BALENAELECTRONJS_OVERLAY_DELAY;
		setTimeout(
			() => {
				createOverlayOpenButton('📡', 'wifi-config', 0, 0);
				createOverlayOpenButton('🔧', 'settings', 60, 0);
				createOverlayOpenButton('🖴', 'mounts', 120, 0);
				createOverlaySleepButton(180, 0);
			},
			delay === undefined ? 200 : delay,
		);
		// _init exists on BrowserWindow's prototype
		// @ts-ignore
		const originalInit = electron.BrowserWindow.prototype._init;
		// @ts-ignore
		electron.BrowserWindow.prototype._init = function () {
			originalInit.call(this);
			this.setBounds({
				x: 0,
				y: 0,
				width,
				height,
			});
			this.webContents.on('dom-ready', () => {
				this.webContents.executeJavaScript(focusScript);
			});
		};
	}

	// @ts-ignore
	BrowserWindow.prototype._init = electron.BrowserWindow.prototype._init;

	openDialogInit(electron);
	electron.app.on('ready', ready);

	// @ts-ignore We're declaring a global that will be used in other projects that can't access balena-electronjs types
	global.BALENAELECTRONJS_SETTINGS = new Settings();
	// @ts-ignore
	screenSaverInit(global.BALENAELECTRONJS_SETTINGS);
}

if (!initialized) {
	init();
	initialized = true;
}

export type WindowName = 'settings' | 'wifi-config' | 'mounts';

const windows: Map<WindowName, electron.BrowserWindow> = new Map();

electron.ipcMain.on('show-window', (_event: Event, name: WindowName) => {
	let win = windows.get(name);
	if (win === undefined || win.isDestroyed()) {
		win = new electron.BrowserWindow({
			frame: false, // TODO: needed?
			webPreferences: {
				nodeIntegration: true,
			},
		});
		win.loadURL(uiUrl(name));
		windows.set(name, win);
	} else {
		win.focus();
	}
});

electron.ipcMain.handle('mount-drive', async (_event, drivePath: string) => {
	// Will mount all partitions of the drive
	// drivePath is the name of the drive in /dev/disk/by-path
	// something like pci-0000:00:14.0-usb-0:3.4.3:1.0-scsi-0:0:0:0
	const partitions = await listPartitionsOnce();
	await Promise.all(
		Array.from(partitions.values()).map(async (partition) => {
			if (
				partition.mountpoint === undefined &&
				partition.path.startsWith(drivePath)
			) {
				try {
					await mount(partition);
				} catch (error) {
					console.error(error);
				}
			}
		}),
	);
});
