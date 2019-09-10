import * as electron from 'electron';

import {
	focusScript,
	init as onScreenKeyboardInit,
} from './on-screen-keyboard';
import { init as openDialogInit } from './open-dialog';
import { init as screenSaverInit } from './screensaver';
import { Settings } from './settings/settings';

const SIDEBAR_WIDTH = 200;

let initialized = false;

function init() {
	const originalBrowserWindow = electron.BrowserWindow;

	class BrowserWindow extends originalBrowserWindow {
		constructor(options: any) {
			// TODO
			super(options);
		}
	}

	function createSidebar(height: number) {
		const win = new BrowserWindow({
			width: SIDEBAR_WIDTH,
			height,
			x: 0,
			y: 0,
			frame: false,
			webPreferences: {
				nodeIntegration: true,
			},
		});
		win.loadURL(`file://${__dirname}/ui/sidebar.html`);
	}

	function ready() {
		onScreenKeyboardInit(electron);
		const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
		createSidebar(height);
		// _init exists on BrowserWindow's prototype
		// @ts-ignore
		const originalInit = electron.BrowserWindow.prototype._init;
		// @ts-ignore
		electron.BrowserWindow.prototype._init = function() {
			originalInit.call(this);
			this.setBounds({
				x: SIDEBAR_WIDTH,
				y: 0,
				width: width - SIDEBAR_WIDTH,
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

type WindowName = 'settings' | 'wifi-config';

const windows: Map<WindowName, electron.BrowserWindow> = new Map();

electron.ipcMain.on('show-window', (_event: any, name: WindowName) => {
	// TODO: any
	let win = windows.get(name);
	if (win === undefined || win.isDestroyed()) {
		win = new electron.BrowserWindow({
			frame: false, // TODO: needed?
			webPreferences: {
				nodeIntegration: true,
			},
		});
		win.loadURL(`file://${__dirname}/ui/${name}.html`);
		windows.set(name, win);
	} else {
		win.focus();
	}
});
