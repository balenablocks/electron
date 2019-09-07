import * as debug_ from 'debug';
import * as Electron from 'electron';
import { stringify } from 'querystring';

const debug = debug_('balena-electronjs');

type ShowOpenDialogCallback = (
	filePaths?: string[],
	bookmarks?: string[],
) => void;

export function init(electron: typeof Electron) {
	function createOpenDialogWindow(
		options: Electron.OpenDialogOptions,
		callback: ShowOpenDialogCallback,
	) {
		electron.ipcMain.once('select-files', (_event: Event, arg: any) => {
			callback(arg);
		});
		const win = new electron.BrowserWindow({
			frame: false,
			webPreferences: {
				nodeIntegration: true,
			},
		});
		win.loadURL(
			`file://${__dirname}/ui/file-selector-window.html?${stringify(options as {
				[key: string]: any;
			})}`,
		);
	}

	const originalShowOpenDialog = electron.dialog.showOpenDialog;

	function showOpenDialog(
		browserWindow: Electron.BrowserWindow,
		options: Electron.OpenDialogOptions,
		callback?: ShowOpenDialogCallback,
	): string[] | undefined;

	function showOpenDialog(
		options: Electron.OpenDialogOptions,
		callback?: ShowOpenDialogCallback,
	): string[] | undefined;

	// TODO: don't allow opening more than one open dialog
	function showOpenDialog(
		arg0: Electron.BrowserWindow | Electron.OpenDialogOptions,
		arg1?: Electron.OpenDialogOptions | ShowOpenDialogCallback,
		arg2?: ShowOpenDialogCallback,
	): string[] | undefined {
		let browserWindow: Electron.BrowserWindow | undefined;
		let options: Electron.OpenDialogOptions;
		let callback: ShowOpenDialogCallback | undefined;
		if (arg0 instanceof Electron.BrowserWindow) {
			browserWindow = arg0;
			options = arg1 as Electron.OpenDialogOptions;
			callback = arg2;
		} else {
			options = arg1 as Electron.OpenDialogOptions;
			callback = arg2;
		}
		if (callback === undefined) {
			debug(
				'Calling showOpenDialog with no callback is not supported, falling back to native file picker',
			);
			if (browserWindow === undefined) {
				return originalShowOpenDialog(options);
			} else {
				return originalShowOpenDialog(browserWindow, options);
			}
		}
		createOpenDialogWindow(options, callback);
		return undefined;
	}

	electron.dialog.showOpenDialog = showOpenDialog;
}
