import * as electron from 'electron';

import {
	focusScript,
	init as onScreenKeyboardInit,
} from './on-screen-keyboard';
import { init as openDialogInit } from './open-dialog';

const SIDEBAR_WIDTH = 200;

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

const originalBrowserWindow = electron.BrowserWindow;

class BrowserWindow extends originalBrowserWindow {
	constructor(options: any) {
		// TODO
		super(options);
	}
}

// @ts-ignore
BrowserWindow.prototype._init = electron.BrowserWindow.prototype._init;

openDialogInit(electron);
electron.app.on('ready', ready);
