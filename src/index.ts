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

	function createOverlayButton(
		url: string,
		x: number,
		y: number,
		width?: number,
		height?: number,
	) {
		const win = new BrowserWindow({
			show: false,
			focusable: false,
			frame: false,
			transparent: true,
			width: width ?? 24,
			height: height ?? 24,
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
		createOverlayButton(uiUrl('sleep-overlay-icon'), x, y, 76);
	}

	function getButtonPosition(
		name: 'sleep' | 'wifi' | 'settings' | 'mounts',
	): [number, number] | undefined {
		const result = /^(\d+),(\d+)$/.exec(
			env[`BALENAELECTRONJS_${name.toUpperCase()}_BUTTON_POSITION`] || '',
		);
		if (result !== null) {
			const [, x, y] = result;
			return [parseInt(x, 10), parseInt(y, 10)];
		}
	}

	const windows: Map<WindowName, electron.BrowserWindow> = new Map();

	electron.ipcMain.on('show-window', (_event: Event, name: WindowName) => {
		let win = windows.get(name);
		if (win === undefined || win.isDestroyed()) {
			win = new BrowserWindow({
				frame: false,
				webPreferences: {
					nodeIntegration: true,
				},
				transparent: true,
				...getWindowRect(),
			});
			win.loadURL(uiUrl(name));
			win.webContents.on('dom-ready', () => {
				win?.webContents.executeJavaScript(focusScript);
			});
			windows.set(name, win);
		} else {
			win.focus();
		}
	});

	function ready() {
		onScreenKeyboardInit(electron);
		const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
		// delay required in order to have transparent windows
		// https://github.com/electron/electron/issues/16809
		const delay = env.BALENAELECTRONJS_OVERLAY_DELAY;
		setTimeout(
			() => {
				const sleepPosition = getButtonPosition('sleep');
				if (sleepPosition !== undefined) {
					createOverlaySleepButton(...sleepPosition); // 20, 13
				}
				const wifiPosition = getButtonPosition('wifi');
				if (wifiPosition !== undefined) {
					createOverlayButton(
						uiUrl('open-wifi-config'),
						...wifiPosition,
						24,
						28,
					); // 114, 13
				}
				const settingsPosition = getButtonPosition('settings');
				if (settingsPosition !== undefined) {
					createOverlayOpenButton('🔧', 'settings', ...settingsPosition); // 156, 13
				}
				const mountsPosition = getButtonPosition('mounts');
				if (mountsPosition !== undefined) {
					createOverlayOpenButton('🖴', 'mounts', ...mountsPosition); // 198, 13
				}
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

function getWindowRect() {
	let { x, y, width, height } = electron.screen.getPrimaryDisplay().workArea;
	const MARGIN_TOP = 50;
	const MARGIN_BOTTOM = 10;
	const MARGIN_LEFT = 10;
	x += MARGIN_LEFT;
	y += MARGIN_TOP;
	width -= 2 * MARGIN_LEFT;
	height -= MARGIN_TOP + MARGIN_BOTTOM;
	return { x, y, width, height };
}

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
