import { fromCallback } from 'bluebird';
import { DBusInterface, DBusService, systemBus } from 'dbus-native';
import { EventEmitter } from 'events';
import * as _ from 'lodash';
import { promisify } from 'util';

import { Dict, OrderedMap } from './utils';

const SYSTEM_BUS = systemBus();

async function getAllProperties(
	properties: DBusInterface,
	iface: string,
): Promise<PropertyChange[]> {
	return await fromCallback((callback) => {
		properties.GetAll(iface, callback);
	});
}

async function getInterface(
	service: DBusService,
	path: string,
	iface: string,
): Promise<DBusInterface> {
	return await fromCallback((callback) => {
		service.getInterface(path, iface, callback);
	});
}

interface FieldDefinition {
	interfaceName: string;
	subtree: Dict<FieldDefinition | null>;
	extraListeners?: Dict<(...args: any[]) => Promise<void>>;
	extraInit?: (o: DBusObjectNode) => Promise<void>;
}

type PropertyChange = [string, [{ type: string; child: any[] }, [any]]];

export class DBusObjectNode extends EventEmitter {
	private listener: (
		interfaceName: string,
		changes: PropertyChange[],
	) => Promise<void>;
	private service: DBusService;
	private propertiesInterface?: DBusInterface;
	public iface?: DBusInterface;
	public destroyed = false;
	public readonly state: Dict<any> = {};
	private extraListeners: Dict<(...args: any[]) => Promise<void>> = {};

	public static async tryCreate(
		serviceName: string,
		interfaceName: string,
		path: string,
		subtree: Dict<FieldDefinition | null>,
		parent?: DBusObjectNode,
		extraListeners?: Dict<(...args: any[]) => Promise<void>>,
		extraInit?: (o: DBusObjectNode) => Promise<void>,
	) {
		try {
			return await this.create(
				serviceName,
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
					(Array.isArray(error) &&
						(error[0] === `No such interface “${interfaceName}”` ||
							error[0] ===
								`No such interface “${interfaceName}” on object at path ${path}`)) ||
					error.message === 'No such interface found'
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
		serviceName: string,
		interfaceName: string,
		path: string,
		subtree: Dict<FieldDefinition | null>,
		parent?: DBusObjectNode,
		extraListeners?: Dict<(...args: any[]) => Promise<void>>,
		extraInit?: (o: DBusObjectNode) => Promise<void>,
	) {
		const obj = new DBusObjectNode(
			serviceName,
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
		public readonly serviceName: string,
		public readonly interfaceName: string,
		public readonly path: string,
		private subtree: Dict<FieldDefinition | null>,
		private parent?: DBusObjectNode,
		extraListeners?: Dict<(...args: any[]) => Promise<void>>,
		private extraInit?: (o: DBusObjectNode) => Promise<void>,
	) {
		super();
		this.service = SYSTEM_BUS.getService(serviceName);
		this.listener = async (
			_interfaceName: string,
			changes: PropertyChange[],
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
		this.propertiesInterface = await getInterface(
			this.service,
			this.path,
			'org.freedesktop.DBus.Properties',
		);
		const properties = await getAllProperties(
			this.propertiesInterface,
			this.interfaceName,
		);
		await this.parseProperties(properties);
		this.iface = await getInterface(
			this.service,
			this.path,
			this.interfaceName,
		);
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

	public async setProperty(name: string, value: [string, any]): Promise<void> {
		if (this.propertiesInterface === undefined) {
			return;
		}
		const setProperty = promisify(this.propertiesInterface.Set).bind(
			this.propertiesInterface,
		);
		await setProperty(this.interfaceName, name, value);
	}

	private async parseProperties(properties: PropertyChange[]) {
		const newState: Dict<any> = {};
		let hasNewData = false;
		for (let [key, [, [value]]] of properties) {
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
										this.serviceName,
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
									this.serviceName,
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
