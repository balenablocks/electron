import { Settings as SettingsSchema } from './settings/schema';
import { Settings } from './settings/settings';
import { exec } from './utils';

export async function screenOff(): Promise<void> {
	await exec('xset', 'dpms', 'force', 'off');
}

async function setSleepDelay(
	value: SettingsSchema['sleepDelay'],
): Promise<void> {
	if (value === 'never') {
		await exec('xset', 's', 'off', '-dpms');
	} else {
		const seconds = parseInt(value, 10) * 60;
		await exec('xset', 'dpms', '0', '0', seconds.toString(10));
	}
}

export async function init(settings: Settings): Promise<void> {
	const sleepDelay = await settings.get('sleepDelay');
	await setSleepDelay(sleepDelay);
	settings.on('change', (key, value) => {
		if (key === 'sleepDelay') {
			setSleepDelay(value);
		}
	});
}
