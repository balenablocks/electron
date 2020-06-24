// FIXME: It would be nicer to use node-udev (native module) for
// watching drives but this would require to rebuild it for the
// target electron version which we don't know.

import { Mutex } from 'async-mutex';
import { Dirent, promises as fs, watch } from 'fs';
import * as _ from 'lodash';
import { dirname, join, resolve, sep } from 'path';
import { env } from 'process';

import { exec } from './utils';

const MOUNTS_ROOT = env['BALENA_ELECTRONJS_MOUNTS_ROOT'] || '/tmp/media';
const BY_PATH_DIR = '/dev/disk/by-path';
const MOUNTS: Map<string, MntEnt> = new Map();
const LINKS: Map<string, string> = new Map();

interface MntEnt {
	fsname: string;
	dir: string;
	type: string;
	opts: string;
	freq: number;
	passno: number;
}

function unescapeOctal(s: string): string {
	return s.replace(/\\([0-7]{3})/g, (_substring, n) =>
		String.fromCharCode(parseInt(n, 8)),
	);
}

function unescapeHex(s: string): string {
	return s.replace(/\\x([0-9a-f]{2})/g, (_substring, n) =>
		String.fromCharCode(parseInt(n, 16)),
	);
}

function parseProcMounts(data: string): MntEnt[] {
	return data
		.split('\n')
		.filter((line) => line.length > 0)
		.map((line) => line.split(' ').map(unescapeOctal))
		.map(([fsname, dir, type, opts, freq, passno]) => ({
			fsname,
			dir,
			type,
			opts,
			freq: parseInt(freq, 10),
			passno: parseInt(passno, 10),
		}));
}

async function resolveLink(link: string): Promise<string> {
	return resolve(dirname(link), await fs.readlink(link));
}

let procMountsContents: string;

async function updateMounts(): Promise<boolean> {
	const newContents = await fs.readFile('/proc/self/mounts', 'utf8');
	if (newContents === procMountsContents) {
		return false;
	}
	procMountsContents = newContents;
	const mounts = parseProcMounts(procMountsContents);
	MOUNTS.clear();
	await Promise.all(
		mounts.map(async (mnt) => {
			const device = mnt.fsname.startsWith('/dev/disk/')
				? await resolveLink(mnt.fsname)
				: mnt.fsname;
			MOUNTS.set(device, mnt);
		}),
	);
	return true;
}

export interface Partition {
	device: string;
	path: string;
	mountpoint?: string;
	info: Partial<UdevadmInfo>;
}

async function getLinkNames(
	folder: string,
	result: Map<string, string>,
): Promise<void> {
	result.clear();
	let links: string[];
	try {
		links = await fs.readdir(folder);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return;
		}
		throw error;
	}
	await Promise.all(
		links.map(async (linkName) => {
			const link = join(folder, linkName);
			result.set(await resolveLink(link), linkName);
		}),
	);
}

function isSubdir(root: string, subdir: string): boolean {
	if (!root.endsWith(sep)) {
		root += sep;
	}
	return subdir.startsWith(root);
}

function isPartition(path: string) {
	return /^.*-part\d+$/.test(path);
}

async function updateLinks(): Promise<void> {
	await getLinkNames(BY_PATH_DIR, LINKS);
}

async function listPartitions(): Promise<Map<string, Partition>> {
	const pathsArray = Array.from(LINKS.values());
	const partitions: Map<string, Partition> = new Map();
	for (const [device, path] of LINKS.entries()) {
		// Filter out drives that have a partition table:
		if (
			!isPartition(path) &&
			pathsArray.find((p) => p !== path && p.startsWith(path)) !== undefined
		) {
			continue;
		}
		const mnt = MOUNTS.get(device);
		let mountpoint: string | undefined;
		if (mnt) {
			// Filter out anything not in MOUNTS_ROOT
			if (!isSubdir(MOUNTS_ROOT, mnt.dir)) {
				continue;
			}
			mountpoint = mnt.dir;
		}
		let info: Partial<UdevadmInfo>;
		try {
			info = await getUdevadmInfo(join(BY_PATH_DIR, path));
		} catch (error) {
			// The device might no longer be there
			continue;
		}
		if (
			info.udisksIgnore === '1' ||
			info.devname !== device ||
			info.idFsUsage !== 'filesystem'
		) {
			continue;
		}
		partitions.set(device, { path, device, mountpoint, info });
	}
	return partitions;
}

const UDEVADM_KEYS = [
	'DEVNAME',
	'DEVTYPE', // disk or partition
	'ID_FS_LABEL_ENC',
	'ID_FS_TYPE',
	'ID_FS_USAGE',
	'ID_FS_UUID_ENC',
	'ID_MODEL_ENC',
	'ID_VENDOR_ENC',
	'UDISKS_IGNORE',
];

interface UdevadmInfo {
	devname: string;
	devtype: string;
	idFsLabel: string;
	idFsType: string;
	idFsUsage: string;
	idFsUuid: string;
	idModel: string;
	idVendor: string;
	udisksIgnore: string;
}

async function getUdevadmInfo(device: string): Promise<Partial<UdevadmInfo>> {
	const { stdout } = await exec('udevadm', 'info', device);
	const info: Partial<UdevadmInfo> = {};
	for (const line of stdout.split('\n')) {
		if (line.startsWith('E: ')) {
			let [key, value] = line.substring(3).split('=');
			if (UDEVADM_KEYS.includes(key)) {
				if (key.endsWith('_ENC')) {
					key = key.substring(0, key.length - 4);
					value = unescapeHex(value);
				}
				info[_.camelCase(key) as keyof UdevadmInfo] = value;
			}
		}
	}
	return info;
}

export function partitionLabel(partition: Partition): string {
	const label = partition.info.idFsLabel || partition.info.idFsUuid;
	return label ? `${label} (${partition.device})` : partition.device;
}

function partitionMountpoint(partition: Partition): string {
	// Replace slashes with division slashes
	return partitionLabel(partition).replace(/\//g, '∕');
}

async function _mount(partition: Partition): Promise<void> {
	const mountpoint = join(MOUNTS_ROOT, partitionMountpoint(partition));
	await fs.mkdir(mountpoint, { recursive: true });
	await exec('mount', '-o', 'ro', partition.device, mountpoint);
}

async function _umount(partition: Partition): Promise<void> {
	const mnt = MOUNTS.get(partition.device);
	await exec('umount', partition.device);
	if (mnt !== undefined) {
		await fs.rmdir(mnt.dir);
	}
}

async function cleanMountsRoot(): Promise<void> {
	let dirents: Dirent[];
	try {
		dirents = await fs.readdir(MOUNTS_ROOT, { withFileTypes: true });
	} catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
		return;
	}
	const mounts = Array.from(MOUNTS.values()).map((mntent) => mntent.dir);
	await Promise.all(
		dirents.map(async (dirent) => {
			const path = join(MOUNTS_ROOT, dirent.name);
			if (dirent.isDirectory() && !mounts.includes(path)) {
				try {
					await fs.rmdir(path);
				} catch (error) {
					console.error(error);
				}
			}
		}),
	);
}

async function checkMounts(callback: PartitionsChangedCallback): Promise<void> {
	const mountsChanged = await updateMounts();
	if (mountsChanged) {
		callback(await listPartitions());
	}
}

type PartitionsChangedCallback = (partitions: Map<string, Partition>) => void;

let isWatching = false;

const mountsMutex = new Mutex();

export async function listPartitionsOnce() {
	return await mountsMutex.runExclusive(async () => {
		await updateMounts();
		await updateLinks();
		await cleanMountsRoot();
		return await listPartitions();
	});
}

export async function mount(partition: Partition): Promise<void> {
	await mountsMutex.runExclusive(_mount.bind(null, partition));
}

export async function umount(partition: Partition): Promise<void> {
	await mountsMutex.runExclusive(_umount.bind(null, partition));
}

export async function startWatching(
	callback: PartitionsChangedCallback,
): Promise<{
	mount: (partition: Partition) => Promise<void>;
	umount: (partition: Partition) => Promise<void>;
	stopWatching: () => void;
}> {
	if (isWatching) {
		throw new Error('Already watching');
	}
	isWatching = true;
	const debouncedUpdateLinks = _.debounce(async () => {
		await mountsMutex.runExclusive(async () => {
			await updateLinks();
			callback(await listPartitions());
		});
	}, 200);
	callback(await listPartitionsOnce());
	const watcher = watch(
		BY_PATH_DIR,
		{ persistent: false },
		debouncedUpdateLinks,
	);
	const interval = setInterval(async () => {
		await mountsMutex.runExclusive(async () => {
			await checkMounts(callback);
		});
	}, 500);

	function stopWatching() {
		watcher.close();
		clearInterval(interval);
		isWatching = false;
	}

	return {
		mount: async (partition) => {
			await mount(partition);
			await checkMounts(callback);
		},
		umount: async (partition) => {
			await umount(partition);
			await checkMounts(callback);
		},
		stopWatching,
	};
}
