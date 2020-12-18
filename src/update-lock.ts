import * as lockfile from 'lockfile';
import { promisify } from 'util';

const lockAsync = promisify(lockfile.lock);
const unlockAsync = promisify(lockfile.unlock);

const LOCKFILE = '/tmp/balena/updates.lock';

export async function lock() {
	try {
		await lockAsync(LOCKFILE);
	} catch (error) {
		console.error('Failed to acquire update lock', error);
	}
}

export async function unlock() {
	try {
		await unlockAsync(LOCKFILE);
	} catch (error) {
		console.error('Failed to release update lock', error);
	}
}
