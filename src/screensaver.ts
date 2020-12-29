import { spawn } from 'child_process';
import * as debug_ from 'debug';
import * as electron from 'electron';
import { env } from 'process';
import { promisify } from 'util';
import * as x11 from 'x11';

import { Settings } from './settings/settings';
import { lock, unlock } from './update-lock';
import { execFile } from './utils';

const debug = debug_('balena-electronjs:screensaver');

const {
	BALENAELECTRONJS_SCREENSAVER_DELAY_OVERRIDE: screensaverDelayOverride,
	BALENAELECTRONJS_SCREENSAVER_ON_COMMAND: screensaverOnCommand,
	BALENAELECTRONJS_SCREENSAVER_OFF_COMMAND: screensaverOffCommand,
	BALENAELECTRONJS_UPDATES_ONLY_DURING_SCREENSAVER: updatesOnlyDuringScreensaver,
} = env;

const createClient = promisify(x11.createClient);

export async function screenOff(): Promise<void> {
	await execFile('xset', 'dpms', 'force', 'off');
}

async function screenOn(): Promise<void> {
	await execFile('xset', 'dpms', 'force', 'on');
}

let screensaverDisabled = false;

async function setSleepDelay(value?: string): Promise<void> {
	if (screensaverDisabled) {
		return;
	}
	value =
		value ??
		screensaverDelayOverride ??
		(await Settings.getInstance().get('sleepDelay'));
	if (value === 'never') {
		await execFile('xset', 's', 'off', '-dpms');
	} else {
		const minutes = parseInt(value!, 10);
		if (!isNaN(minutes)) {
			const seconds = minutes * 60;
			await execFile('xset', 'dpms', '0', '0', seconds.toString(10));
		}
	}
}

async function setScreensaverHooks(): Promise<void> {
	debug(
		`setting screensaver hooks, BALENAELECTRONJS_UPDATES_ONLY_DURING_SCREENSAVER is "${updatesOnlyDuringScreensaver}"`,
	);
	const display = await createClient();
	const root = display.screen[0].root;
	const req = promisify(display.client.require).bind(display.client);
	const ext = await req('screen-saver');
	ext.SelectInput(root, ext.eventMask.Notify);
	await (updatesOnlyDuringScreensaver ? lock : unlock)();
	display.client.on('event', async (ev) => {
		if (ev.name === 'ScreenSaverNotify') {
			if (ev.state === ext.NotifyState.On) {
				debug('screensaver on');
				if (screensaverOnCommand !== undefined) {
					spawn('sh', ['-c', screensaverOnCommand]);
				}
				if (updatesOnlyDuringScreensaver) {
					// Allow updating the application while the screensaver is on
					await unlock();
				}
			} else if (ev.state === ext.NotifyState.Off) {
				debug('screensaver off');
				if (updatesOnlyDuringScreensaver) {
					// Prevent updating the application
					await lock();
				}
				if (screensaverOffCommand !== undefined) {
					spawn('sh', ['-c', screensaverOffCommand]);
				}
			}
		}
	});
}

export async function init(): Promise<void> {
	// When the container is restarted when the screen was off,
	// we need to turn the screen off and on again to make it work.
	// screenOn() without screenOff() before has no effect.
	// We need to do this before setScreensaverHooks().
	await screenOff();
	await screenOn();
	electron.ipcMain.handle('disable-screensaver', async () => {
		debug('disabling screensaver');
		await setSleepDelay('never');
		screensaverDisabled = true;
	});
	electron.ipcMain.handle('enable-screensaver', async () => {
		debug('enabling screensaver');
		screensaverDisabled = false;
		await setSleepDelay();
	});
	await setSleepDelay();
	Settings.getInstance().on('change', (key) => {
		if (key === 'sleepDelay') {
			setSleepDelay();
		}
	});
	await setScreensaverHooks();
}
