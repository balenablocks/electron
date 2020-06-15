import { delay } from 'bluebird';
import * as _ from 'lodash';
import * as React from 'react';
import { promisify } from 'util';

import { DBusObjectNode } from '../dbus';
import { CloseableWindow, render } from './theme';

const SCAN_INTERVAL = 3000;
const ALLOWED_SCAN_ERRORS = [
	'Scanning not allowed at this time',
	'Scanning not allowed while already scanning',
	'Scanning not allowed while unavailable or activating',
	'Scanning not allowed immediately following previous scan',
];

enum NM_ACTIVE_CONNECTION_STATE {
	UNKNOWN,
	ACTIVATING,
	ACTIVATED,
	DEACTIVATING,
	DEACTIVATED,
}

const NM_ACTIVE_CONNECTION_STATE_LABELS: Map<
	NM_ACTIVE_CONNECTION_STATE,
	string
> = new Map([
	[NM_ACTIVE_CONNECTION_STATE.UNKNOWN, 'unknown'],
	[NM_ACTIVE_CONNECTION_STATE.ACTIVATING, 'activating'],
	[NM_ACTIVE_CONNECTION_STATE.ACTIVATED, 'activated'],
	[NM_ACTIVE_CONNECTION_STATE.DEACTIVATING, 'deactivating'],
	[NM_ACTIVE_CONNECTION_STATE.DEACTIVATED, 'deactivated'],
]);

interface Connection {
	path: string;
	Settings: any[];
	Secrets: any[];
}

interface AccessPointProps {
	path: string;
	active: boolean;
	configured: boolean;
	Ssid: Buffer;
	Strength: number;
	RsnFlags: number;
	WpaFlags: number;
	state?: NM_ACTIVE_CONNECTION_STATE;
	createConnection?: () => void;
	forgetConnection?: () => void;
	connect?: () => void;
}

function passphraseRequired(ap: AccessPointProps) {
	return ap.RsnFlags !== 0 || ap.WpaFlags !== 0;
}

class AccessPoint extends React.PureComponent<AccessPointProps> {
	public render() {
		let stateStr: string = '';
		if (this.props.state !== undefined) {
			stateStr = `(${NM_ACTIVE_CONNECTION_STATE_LABELS.get(this.props.state)})`;
		}
		return (
			<li key={this.props.path}>
				<h1>
					{this.props.Ssid.toString()} {this.props.active ? '🗸' : ''}
					{''}
					{stateStr}
					{this.props.configured ? '⚙' : ''}
					{passphraseRequired(this.props) ? '🔒' : ''}
				</h1>
				<h2>{this.props.Strength}%</h2>
				{this.props.createConnection !== undefined && (
					<button
						type="button"
						onClick={() => {
							// @ts-ignore
							this.props.createConnection();
						}}
					>
						Create and connect
					</button>
				)}
				{this.props.connect !== undefined && (
					<button
						type="button"
						onClick={() => {
							// @ts-ignore
							this.props.connect();
						}}
					>
						Connect
					</button>
				)}
				{this.props.forgetConnection !== undefined && (
					<button
						type="button"
						onClick={() => {
							// @ts-ignore
							this.props.forgetConnection();
						}}
					>
						Forget
					</button>
				)}
			</li>
		);
	}
}

interface WifiDeviceProps {
	AccessPoints: AccessPointProps[];
	ActiveAccessPoint: string;
	path: string;
	configuredWifiConnections: Map<string, Connection>;
	connectionStates: Map<string, NM_ACTIVE_CONNECTION_STATE>;
	forgetConnection: (connectionPath: string) => void;
	connect: (connectionPath: string) => void;
	createConnection: (ssid: string) => void;
}

class WifiDevice extends React.PureComponent<WifiDeviceProps, {}> {
	public render() {
		const accessPoints = this.props.AccessPoints.map((ap: AccessPointProps) => {
			const active = ap.path === this.props.ActiveAccessPoint;
			const ssid = ap.Ssid.toString();
			const configuredConnection = this.props.configuredWifiConnections.get(
				ssid,
			);
			const configured = configuredConnection !== undefined;
			const createConnection = configured
				? undefined
				: () => {
						// @ts-ignore
						this.props.createConnection(ssid);
				  };
			const forgetConnection = configured
				? () => {
						// @ts-ignore
						this.props.forgetConnection(configuredConnection.path);
				  }
				: undefined;
			const connect =
				configured && !active
					? () => {
							// @ts-ignore
							this.props.connect(configuredConnection.path);
					  }
					: undefined;
			const state = this.props.connectionStates.get(ssid);
			return {
				...ap,
				active,
				configured,
				createConnection,
				forgetConnection,
				connect,
				state,
			};
		});

		return (
			<>
				<ul>
					{_.orderBy(
						accessPoints,
						['active', 'Strength'],
						['desc', 'desc'],
					).map((ap: AccessPointProps) => {
						return <AccessPoint {...ap} />;
					})}
				</ul>
			</>
		);
	}
}

async function reloadSettings(o: DBusObjectNode): Promise<void> {
	if (o.iface !== undefined) {
		const getSettings = promisify(o.iface.GetSettings).bind(o.iface);
		const getSecrets = promisify(o.iface.GetSecrets).bind(o.iface);
		o.state.Settings = await getSettings();
		try {
			o.state.Secrets = await getSecrets('802-11-wireless-security');
		} catch (error) {
			// no secrets, do nothing
		}
		o.emit('PropertiesChanged');
	}
}

interface ActiveConnection {
	Connection: Connection;
	Devices: string[];
	State: NM_ACTIVE_CONNECTION_STATE;
}

interface WifiConfigState {
	ActiveConnections: ActiveConnection[];
	Devices: WifiDeviceProps[];
	WirelessEnabled: boolean;
	configuredWifiConnections: Map<string, Connection>;
	connectionStates: Map<string, NM_ACTIVE_CONNECTION_STATE>;
	creatingConnection?: string; // ssid
}

class WifiConfig extends React.Component<{}, WifiConfigState> {
	private networkManagerSettings: DBusObjectNode;
	private networkManager: DBusObjectNode;
	public boundForgetConnection: (connectionPath: string) => void;
	public boundConnect: (connectionPath: string) => void;
	public boundCreateConnection: (ssid: string) => void;

	constructor(props: {}) {
		super(props);
		this.boundCreateConnection = this.createConnection.bind(this);
		this.boundConnect = this.connect.bind(this);
		this.boundForgetConnection = this.forgetConnection.bind(this);
		this.state = {
			ActiveConnections: [],
			Devices: [],
			WirelessEnabled: false,
			configuredWifiConnections: new Map(),
			connectionStates: new Map(),
		};
		this.init();
	}

	private parseConnections() {
		if (this.networkManagerSettings !== undefined) {
			const settings = this.networkManagerSettings.dump();
			const configuredWifiConnections: Map<string, any> = new Map();
			for (const connection of settings.Connections) {
				const ssid = getSetting(connection.Settings, '802-11-wireless', 'ssid');
				if (ssid === undefined) {
					continue;
				}
				configuredWifiConnections.set(ssid.toString(), connection);
			}
			this.setState({ configuredWifiConnections });
		}
	}

	private updateActiveConnectionStatus() {
		if (this.state.Devices.length === 0) {
			return;
		}
		const connectionStates: Map<string, NM_ACTIVE_CONNECTION_STATE> = new Map();
		const devicePath = this.state.Devices[0].path;
		for (const ac of this.state.ActiveConnections) {
			if (ac.Connection === undefined) {
				continue;
			}
			if (ac.Devices.includes(devicePath)) {
				const ssid = getSetting(
					ac.Connection.Settings,
					'802-11-wireless',
					'ssid',
				).toString();
				connectionStates.set(ssid, ac.State);
			}
		}
		this.setState({ connectionStates });
	}

	private async init() {
		this.networkManagerSettings = await DBusObjectNode.create(
			'org.freedesktop.NetworkManager',
			'org.freedesktop.NetworkManager.Settings',
			'/org/freedesktop/NetworkManager/Settings',
			{
				Connections: {
					// TODO: factorize
					interfaceName: 'org.freedesktop.NetworkManager.Settings.Connection',
					subtree: {
						Unsaved: null,
						Flags: null,
						Filename: null,
					},
					extraListeners: {
						Updated: reloadSettings,
					},
					extraInit: reloadSettings,
				},
			},
		);
		this.parseConnections();
		this.networkManagerSettings.on('PropertiesChanged', () => {
			this.parseConnections();
		});

		this.networkManager = await DBusObjectNode.create(
			'org.freedesktop.NetworkManager',
			'org.freedesktop.NetworkManager',
			'/org/freedesktop/NetworkManager',
			{
				ActiveConnections: {
					interfaceName: 'org.freedesktop.NetworkManager.Connection.Active',
					subtree: {
						Connection: {
							interfaceName:
								'org.freedesktop.NetworkManager.Settings.Connection',
							subtree: {
								Unsaved: null,
								Flags: null,
								Filename: null,
							},
							extraListeners: {
								Updated: reloadSettings,
							},
							extraInit: reloadSettings,
						},
						Devices: null,
						State: null,
					},
				},
				Devices: {
					interfaceName: 'org.freedesktop.NetworkManager.Device.Wireless',
					subtree: {
						AccessPoints: {
							interfaceName: 'org.freedesktop.NetworkManager.AccessPoint',
							subtree: {
								Ssid: null,
								Strength: null,
								RsnFlags: null,
								WpaFlags: null,
							},
						},
						ActiveAccessPoint: null,
					},
					extraInit: async (o: DBusObjectNode) => {
						(async () => {
							while (!o.destroyed && o.iface !== undefined) {
								const requestScan = promisify(o.iface.RequestScan).bind(
									o.iface,
								);
								try {
									await requestScan({});
								} catch (error) {
									if (!ALLOWED_SCAN_ERRORS.includes(error[0])) {
										throw error;
									}
								}
								await delay(SCAN_INTERVAL);
							}
						})();
					},
				},
				WirelessEnabled: null,
			},
		);
		this.setState(this.networkManager.dump() as WifiConfigState);
		this.updateActiveConnectionStatus();
		this.networkManager.on('PropertiesChanged', () => {
			this.setState(this.networkManager.dump() as WifiConfigState);
			this.updateActiveConnectionStatus();
		});
	}

	private async handleWirelessEnabledCheckbox(
		event: React.ChangeEvent<HTMLInputElement>,
	) {
		if (event.target) {
			await this.networkManager.setProperty('WirelessEnabled', [
				'b',
				event.target.checked ? 1 : 0,
			]);
		}
	}

	private async forgetConnection(connectionPath: string) {
		const connection = this.networkManagerSettings.state.Connections.get(
			connectionPath,
		);
		const Delete = promisify(connection.iface.Delete).bind(connection.iface);
		await Delete();
	}

	private createConnection(ssid: string) {
		const accessPoint = this.getAccessPointBySsid(ssid);
		if (passphraseRequired(accessPoint)) {
			this.setState({ creatingConnection: ssid });
		} else {
			this.addAndActivateConnection(ssid);
		}
	}

	private async connect(connectionPath: string) {
		if (this.networkManager.iface === undefined) {
			return;
		}
		const activateConnection = promisify(
			this.networkManager.iface.ActivateConnection,
		).bind(this.networkManager.iface);
		const devicePath = this.state.Devices[0].path;
		await activateConnection(connectionPath, devicePath, '/');
	}

	public render() {
		return (
			<CloseableWindow title="Wifi config">
				<label htmlFor="wireless-enabled">Wireless enabled</label>
				<input
					id="wireless-enabled"
					type="checkbox"
					checked={this.state.WirelessEnabled}
					onChange={this.handleWirelessEnabledCheckbox.bind(this)}
				/>
				{this.state.creatingConnection !== undefined
					? this.renderCreateConnection()
					: this.renderDevice()}
			</CloseableWindow>
		);
	}

	private renderDevice() {
		if (this.state.Devices && this.state.Devices.length) {
			return (
				<WifiDevice
					{...this.state.Devices[0]}
					configuredWifiConnections={this.state.configuredWifiConnections}
					connectionStates={this.state.connectionStates}
					forgetConnection={this.boundForgetConnection}
					createConnection={this.boundCreateConnection}
					connect={this.boundConnect}
				/>
			);
		}
	}

	private passphraseToSettings(passphrase?: string) {
		return passphrase
			? [['802-11-wireless-security', [['psk', ['s', passphrase]]]]]
			: [];
	}
	private getAccessPointBySsid(ssid: string): AccessPointProps {
		const device = this.state.Devices[0];
		return device.AccessPoints.filter(ap => ap.Ssid.toString() === ssid)[0];
	}

	private async addAndActivateConnection(
		ssid: string,
		passphrase?: string,
	): Promise<string | undefined> {
		const device = this.state.Devices[0];
		const accessPoint = this.getAccessPointBySsid(ssid);
		this.setState({ creatingConnection: undefined });
		if (this.networkManager.iface === undefined) {
			return;
		}
		const createConnection = promisify(
			this.networkManager.iface.AddAndActivateConnection,
		).bind(this.networkManager.iface);
		const settings = this.passphraseToSettings(passphrase);
		return await createConnection(settings, device.path, accessPoint.path);
	}

	private renderCreateConnection() {
		return (
			<PasswordBox
				label={`Please enter a passphrase for ${this.state.creatingConnection}`}
				value=""
				ok={async value => {
					const ssid = this.state.creatingConnection as string;
					await this.addAndActivateConnection(ssid, value);
				}}
				cancel={() => {
					this.setState({ creatingConnection: undefined });
				}}
			/>
		);
	}
}

function getSetting(
	settings: Array<[string, any[]]>,
	key: string,
	...keys: string[]
): any {
	for (const [k, value] of settings) {
		if (k === key) {
			if (keys.length === 0) {
				return value[1][0];
			} else {
				// @ts-ignore
				return getSetting(value, ...keys);
			}
		}
	}
}

interface PasswordBoxProps {
	label: string;
	value: string;
	ok: (value: string) => void;
	cancel: () => void;
}

interface PasswordBoxState {
	value: string;
	showPassword: boolean;
}

class PasswordBox extends React.PureComponent<
	PasswordBoxProps,
	PasswordBoxState
> {
	constructor(props: PasswordBoxProps) {
		super(props);
		this.state = { value: props.value, showPassword: false };
	}

	public render() {
		return (
			<>
				<h1>{this.props.label}</h1>
				<input
					autoFocus
					type={this.state.showPassword ? 'text' : 'password'}
					value={this.state.value}
					onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
						this.setState({ value: event.target.value });
					}}
					onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
						if (event.keyCode === 13) {
							// enter
							this.props.ok(this.state.value);
						} else if (event.keyCode === 27) {
							// escape {
							this.props.cancel();
						}
					}}
				/>
				<label htmlFor="show-passphrase">Show passphrase</label>
				<input
					type="checkbox"
					id="show-passphrase"
					checked={this.state.showPassword}
					onChange={this.setShowPassword.bind(this)}
				/>
				<button
					onClick={() => {
						this.props.ok(this.state.value);
					}}
				>
					Ok
				</button>
				<button
					onClick={() => {
						this.props.cancel();
					}}
				>
					Cancel
				</button>
			</>
		);
	}

	private setShowPassword(event: React.ChangeEvent<HTMLInputElement>) {
		this.setState({ showPassword: event.target.checked });
	}
}

render(<WifiConfig />);
