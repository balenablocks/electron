import * as childProcess from 'child_process';
import { readFile, writeFile } from 'fs';
import { stringify } from 'querystring';
import { promisify } from 'util';

export interface Dict<T> {
	[key: string]: T;
}

export class OrderedMap<TKey, TValue> {
	private data: Map<TKey, TValue> = new Map();
	private order: TKey[] = [];

	constructor(pairs?: Iterable<[TKey, TValue]>) {
		if (pairs !== undefined) {
			for (const [key, value] of pairs) {
				this.set(key, value);
			}
		}
	}

	public get(key: TKey) {
		return this.data.get(key);
	}

	public set(key: TKey, value: TValue) {
		this.data.set(key, value);
		if (!this.order.includes(key)) {
			this.order.push(key);
		}
	}

	public delete(key: TKey) {
		this.data.delete(key);
		const index = this.order.indexOf(key);
		if (index !== -1) {
			this.order.splice(index, 1);
		}
	}

	public setOrder(order: TKey[]) {
		this.order = order.filter((key) => this.data.has(key));
		// TODO: add missing keys or throw an error
	}

	public has(key: TKey) {
		return this.data.has(key);
	}

	public *keys() {
		for (const key of this.order) {
			yield key;
		}
	}

	public *values() {
		for (const key of this.order) {
			yield this.data.get(key);
		}
	}

	public *entries() {
		for (const key of this.order) {
			yield [key, this.data.get(key)];
		}
	}
}

export function execFile(
	...command: string[]
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		childProcess.execFile(
			command[0],
			command.slice(1),
			(error, stdout, stderr) => {
				if (error) {
					reject(error);
				} else {
					resolve({ stdout, stderr });
				}
			},
		);
	});
}

export const readFileAsync = promisify(readFile);
export const writeFileAsync = promisify(writeFile);

export function uiUrl(page: string, params: Dict<any> = {}): string {
	const qs = Object.keys(params).length ? '?' + stringify(params) : '';
	return `file://${__dirname}/ui/${page}.html${qs}`;
}

export interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
