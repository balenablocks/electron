import * as debug_ from 'debug';
import * as lockfile from 'lockfile';
import { promisify } from 'util';

const debug = debug_('balena-electronjs:update-lock');

const lockAsync = promisify(lockfile.lock);
const unlockAsync = promisify(lockfile.unlock);

const LOCKFILE = '/tmp/balena/updates.lock';

export async function lock() {
	debug('acquiring update lock');
	try {
		await lockAsync(LOCKFILE);
	} catch (error) {
		debug('Failed to acquire update lock', error);
	}
}

export async function unlock() {
	debug('releasing update lock');
	try {
		await unlockAsync(LOCKFILE);
	} catch (error) {
		debug('Failed to release update lock', error);
	}
}
