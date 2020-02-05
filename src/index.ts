import * as electron from 'electron';

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
		icon: string,
		opens: WindowName,
		x: number,
		y: number,
	) {
		const win = new BrowserWindow({
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
		win.loadURL(uiUrl('open-window-overlay-icon', { icon, opens }));
	}

	function createOverlaySleepButton(x: number, y: number) {
		const win = new BrowserWindow({
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
		win.loadURL(uiUrl('sleep-overlay-icon', { icon: '💤' }));
	}

	function ready() {
		onScreenKeyboardInit(electron);
		const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
		// delay required in order to have transparent windows
		// https://github.com/electron/electron/issues/16809
		setTimeout(
			() => {
				createOverlayButton('📡', 'wifi-config', 0, 0);
				createOverlayButton('🔧', 'settings', 60, 0);
				createOverlayButton('🖴', 'mounts', 120, 0);
				createOverlaySleepButton(180, 0);
			},
			200, // TODO: constant
		);
		// _init exists on BrowserWindow's prototype
		// @ts-ignore
		const originalInit = electron.BrowserWindow.prototype._init;
		// @ts-ignore
		electron.BrowserWindow.prototype._init = function() {
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
	global.BALENA_ELECTRONJS_SETTINGS = new Settings();
	// @ts-ignore
	screenSaverInit(global.BALENA_ELECTRONJS_SETTINGS);
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
