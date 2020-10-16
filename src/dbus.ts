import { Variant, ClientInterface, ProxyObject, systemBus } from 'dbus-next';
import { EventEmitter } from 'events';
import * as _ from 'lodash';

import { Dict, OrderedMap } from './utils';

const SYSTEM_BUS = systemBus();

interface FieldDefinition {
	interfaceName: string;
	subtree: Dict<FieldDefinition | null>;
	extraListeners?: Dict<(...args: any[]) => Promise<void>>;
	extraInit?: (o: DBusObjectNode) => Promise<void>;
}

export class DBusObjectNode extends EventEmitter {
	private listener: (
		interfaceName: string,
		changes: Dict<Variant>,
	) => Promise<void>;
	private proxy: ProxyObject;
	private propertiesInterface?: ClientInterface;
	public iface?: ClientInterface;
	public destroyed = false;
	public readonly state: Dict<any> = {};
	private extraListeners: Dict<(...args: any[]) => Promise<void>> = {};

	public static async tryCreate(
		name: string,
		interfaceName: string,
		path: string,
		subtree: Dict<FieldDefinition | null>,
		parent?: DBusObjectNode,
		extraListeners: Dict<(...args: any[]) => Promise<void>> = {},
		extraInit?: (o: DBusObjectNode) => Promise<void>,
	) {
		try {
			return await this.create(
				name,
				interfaceName,
				path,
				subtree,
				parent,
				extraListeners,
				extraInit,
			);
		} catch (error) {
			if (
				!(
					error.text === `No such interface “${interfaceName}”` ||
					error.text ===
						`No such interface “${interfaceName}” on object at path ${path}` ||
					error.text === 'No such interface found'
				)
			) {
				console.warn(
					`Couldn't get interface ${interfaceName} of ${path}`,
					error,
				);
			}
		}
	}

	public static async create(
		name: string,
		interfaceName: string,
		path: string,
		subtree: Dict<FieldDefinition | null>,
		parent?: DBusObjectNode,
		extraListeners: Dict<(...args: any[]) => Promise<void>> = {},
		extraInit?: (o: DBusObjectNode) => Promise<void>,
	) {
		const obj = new DBusObjectNode(
			name,
			interfaceName,
			path,
			subtree,
			parent,
			extraListeners,
			extraInit,
		);
		await obj.init();
		return obj;
	}

	private constructor(
		public readonly name: string,
		public readonly interfaceName: string,
		public readonly path: string,
		private subtree: Dict<FieldDefinition | null>,
		private parent?: DBusObjectNode,
		extraListeners: Dict<(...args: any[]) => Promise<void>> = {},
		private extraInit?: (o: DBusObjectNode) => Promise<void>,
	) {
		super();
		this.listener = async (
			_interfaceName: string,
			changes: Dict<Variant>,
		): Promise<void> => {
			// TODO: 3rd arg: invalidated_properties
			await this.parseProperties(changes);
		};
		for (const [signal, handler] of Object.entries(extraListeners || {})) {
			this.extraListeners[signal] = async (...args: any[]) => {
				handler(this, ...args);
			};
		}
	}

	private async init() {
		this.proxy = await SYSTEM_BUS.getProxyObject(this.name, this.path);
		this.propertiesInterface = this.proxy.getInterface(
			'org.freedesktop.DBus.Properties',
		);
		const properties = await this.propertiesInterface.GetAll(
			this.interfaceName,
		);
		await this.parseProperties(properties);
		this.iface = await this.proxy.getInterface(this.interfaceName);
		if (this.extraInit !== undefined) {
			await this.extraInit(this);
		}
		if (!this.destroyed) {
			this.propertiesInterface.on('PropertiesChanged', this.listener);
			for (const [signal, handler] of Object.entries(this.extraListeners)) {
				this.iface.on(signal, handler);
			}
		}
	}

	public async setProperty(name: string, value: Variant): Promise<void> {
		if (this.propertiesInterface === undefined) {
			return;
		}
		await this.propertiesInterface.Set(this.interfaceName, name, value);
	}

	private async parseProperties(properties: Dict<Variant>) {
		const newState: Dict<any> = {};
		let hasNewData = false;
		for (const [key, variant] of Object.entries(properties)) {
			let value = variant.value;
			if (this.subtree.hasOwnProperty(key)) {
				const def = this.subtree[key];
				if (def !== null) {
					if (def.interfaceName !== undefined) {
						let oldValue = this.state[key];
						if (Array.isArray(value)) {
							if (oldValue === undefined) {
								this.state[key] = oldValue = new OrderedMap();
							}
							const keys = value;
							const removed: string[] = _.difference(
								Array.from(oldValue.keys()),
								keys,
							);
							const added: string[] = keys.filter(
								(path) => !oldValue.has(path),
							);
							for (const path of removed) {
								const item = oldValue.get(path);
								if (item !== undefined) {
									item.destroy();
									oldValue.delete(path);
								}
							}
							await Promise.all(
								added.map(async (path: string) => {
									const item = await DBusObjectNode.tryCreate(
										this.name,
										def.interfaceName,
										path,
										def.subtree,
										this,
										def.extraListeners,
										def.extraInit,
									);
									if (item !== undefined) {
										oldValue.set(path, item);
									}
								}),
							);
							oldValue.setOrder(keys);
							value = oldValue;
						} else {
							const create = oldValue === undefined || oldValue.path !== value;
							const replace = oldValue !== undefined && oldValue.path !== value;
							if (replace) {
								oldValue.destroy();
							}
							if (create) {
								value = await DBusObjectNode.tryCreate(
									this.name,
									def.interfaceName,
									value,
									def.subtree,
									this,
									def.extraListeners,
									def.extraInit,
								);
							}
						}
					}
				}
				newState[key] = value;
				this.state[key] = value;
				hasNewData = true;
			}
		}
		if (hasNewData) {
			this.propertiesChanged();
		}
	}

	private propertiesChanged() {
		this.emit('PropertiesChanged');
		if (this.parent !== undefined) {
			this.parent.propertiesChanged();
		}
	}

	public destroy() {
		this.destroyed = true;
		// destroy child nodes
		for (const value of Object.values(this.state)) {
			if (value instanceof DBusObjectNode) {
				value.destroy();
			} else if (Array.isArray(value)) {
				for (const v of value) {
					if (v instanceof DBusObjectNode) {
						v.destroy();
					}
				}
			}
		}
		if (this.propertiesInterface !== undefined) {
			this.propertiesInterface.removeListener(
				'PropertiesChanged',
				this.listener,
			);
		}
		if (this.iface !== undefined) {
			for (const [signal, handler] of Object.entries(this.extraListeners)) {
				this.iface.removeListener(signal, handler);
			}
		}
		this.removeAllListeners();
	}

	public dump() {
		const result: Dict<any> = { path: this.path };
		for (const [key, value] of Object.entries(this.state)) {
			if (value instanceof OrderedMap) {
				result[key] = Array.from(value.values()).map((o) => o.dump());
			} else if (value instanceof DBusObjectNode) {
				result[key] = value.dump();
			} else {
				result[key] = value;
			}
		}
		return result;
	}
}
