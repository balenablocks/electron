import * as electron from 'electron';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';

import { Dict } from '../utils';

async function loadJSONFile(path: string) {
	const data = await fs.readFile(path, 'utf8');
	return JSON.parse(data);
}

export class Settings extends EventEmitter {
	private data: Dict<any> = {};
	private schema: Dict<any> = {};
	private ready: Promise<void>;
	private static instance: Settings;

	public static getInstance() {
		if (this.instance === undefined) {
			this.instance = new this();
		}
		return this.instance;
	}

	public async getSchema() {
		await this.ready;
		return this.schema;
	}

	private constructor() {
		super();
		this.ready = this.load();
	}

	private getFilePath(): string {
		return join(
			electron.app.getPath('userData'),
			'balena-electronjs-config.json',
		);
	}

	private async load(): Promise<void> {
		this.schema = await loadJSONFile(join(__dirname, 'settings-schema.json'));
		try {
			this.data = await loadJSONFile(this.getFilePath());
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}
		for (const [key, value] of Object.entries(
			this.schema.definitions.Settings.properties,
		)) {
			// @ts-ignore
			if (value.default !== undefined && this.data[key] === undefined) {
				// @ts-ignore
				this.data[key] = value.default;
			}
		}
	}

	public async set(key: string, value: any): Promise<void> {
		await this.ready;
		if (this.data[key] === value) {
			return;
		}
		this.data[key] = value;
		await fs.writeFile(this.getFilePath(), JSON.stringify(this.data));
		this.emit('change', key, value);
	}

	public async get(key: string): Promise<any> {
		await this.ready;
		return this.data[key];
	}

	public async getData(): Promise<Dict<any>> {
		await this.ready;
		return { ...this.data };
	}
}
