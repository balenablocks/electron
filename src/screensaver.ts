import { env } from 'process';
import { promisify } from 'util';
import * as x11 from 'x11';

import { Settings } from './settings/settings';
import { lock, unlock } from './update-lock';
import { exec, execFile } from './utils';

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

async function setSleepDelay(value: string): Promise<void> {
	value = screensaverDelayOverride ?? value;
	if (value === 'never') {
		await execFile('xset', 's', 'off', '-dpms');
	} else {
		const minutes = parseInt(value, 10);
		if (!isNaN(minutes)) {
			const seconds = minutes * 60;
			await execFile('xset', 'dpms', '0', '0', seconds.toString(10));
		}
	}
}

async function setScreensaverHooks(): Promise<void> {
	const display = await createClient();
	const root = display.screen[0].root;
	const req = promisify(display.client.require).bind(display.client);
	const ext = await req('screen-saver');
	ext.SelectInput(root, ext.eventMask.Notify);
	if (updatesOnlyDuringScreensaver) {
		// Prevent updating the application
		await lock();
	}
	display.client.on('event', async (ev) => {
		if (ev.name === 'ScreenSaverNotify') {
			if (ev.state === ext.NotifyState.On) {
				if (screensaverOnCommand !== undefined) {
					await exec(screensaverOnCommand);
				}
				if (updatesOnlyDuringScreensaver) {
					// Allow updating the application while the screensaver is on
					await unlock();
				}
			} else if (ev.state === ext.NotifyState.Off) {
				if (updatesOnlyDuringScreensaver) {
					// Prevent updating the application
					await lock();
				}
				if (screensaverOffCommand !== undefined) {
					await exec(screensaverOffCommand);
				}
			}
		}
	});
}

export async function init(settings: Settings): Promise<void> {
	const sleepDelay = await settings.get('sleepDelay');
	await setSleepDelay(sleepDelay);
	settings.on('change', (key, value) => {
		if (key === 'sleepDelay') {
			setSleepDelay(value);
		}
	});
	await setScreensaverHooks();
}
