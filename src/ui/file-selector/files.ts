/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { readdir as readdir_, stat, Stats } from 'fs';
import { join, parse, resolve } from 'path';
import { getgid, getuid } from 'process';
import { promisify } from 'util';

const CONCURRENCY = 10;
const COLLATOR = new Intl.Collator(undefined, { sensitivity: 'case' });
const GID = getgid();
const UID = getuid();

const readdirAsync = promisify(readdir_);
const statAsync = promisify(stat);

function compareFiles(fileA: FileEntry, fileB: FileEntry): number {
	// used for sorting files
	return (
		+fileB.isDirectory - +fileA.isDirectory ||
		COLLATOR.compare(fileA.name, fileB.name)
	);
}

export class FileEntry {
	public path: string;
	public dirname: string;
	public basename: string;
	public name: string;
	public ext: string;
	public isHidden: boolean;
	public isFile: boolean;
	public isDirectory: boolean;
	public size: number;

	constructor(filePath: string, stats: Stats) {
		const components = parse(filePath);
		this.path = filePath;
		this.dirname = components.dir;
		this.basename = components.base;
		this.name = components.name;
		this.ext = components.ext;
		this.isHidden = components.name.startsWith('.');
		this.isFile = stats.isFile();
		this.isDirectory = stats.isDirectory();
		this.size = stats.size;
	}
}

function userCanListDirectory(stats: Stats): boolean {
	// tslint:disable:no-bitwise
	return (
		(stats.uid === UID && (stats.mode & 0o100) !== 0) ||
		(stats.gid === GID && (stats.mode & 0o010) !== 0) ||
		(stats.mode & 0o001) !== 0
	);
	// tslint:enable:no-bitwise
}

export async function readdir(dirPath$: string): Promise<FileEntry[]> {
	const dirPath = resolve(dirPath$);
	const fileNames = await readdirAsync(dirPath);
	const filePaths = fileNames.map((name) => join(dirPath, name));
	const files: Array<FileEntry | undefined> = await Promise.all(
		filePaths.map(
			async (filePath) => {
				try {
					const stats = await statAsync(filePath);
					if (stats.isDirectory() && !userCanListDirectory(stats)) {
						return;
					}
					return new FileEntry(filePath, stats);
				} catch (error) {
					return;
				}
			},
			{ concurrency: CONCURRENCY },
		),
	);
	return (files.filter((f) => f !== undefined) as FileEntry[]).sort(
		compareFiles,
	);
}
