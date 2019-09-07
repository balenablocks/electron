import { execFile } from 'child_process';

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
		this.order = order.filter(key => this.data.has(key));
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

export function exec(
	...command: string[]
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		execFile(command[0], command.slice(1), (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else {
				resolve({ stdout, stderr });
			}
		});
	});
}
