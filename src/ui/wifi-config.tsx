import { delay } from 'bluebird';
import { Variant } from 'dbus-next';
import * as _ from 'lodash';
import * as React from 'react';
import {
	Box,
	Button,
	Checkbox,
	Divider,
	Flex,
	Heading,
	Input,
	Spinner,
	Txt,
} from 'rendition';
import { default as styled } from 'styled-components';

import LockSvg from '@fortawesome/fontawesome-free/svgs/solid/lock.svg';
import WrenchSvg from '@fortawesome/fontawesome-free/svgs/solid/wrench.svg';
import ChevronLeftSvg from '@fortawesome/fontawesome-free/svgs/solid/chevron-left.svg';
import TimesSvg from '@fortawesome/fontawesome-free/svgs/solid/times.svg';

import { DBusObjectNode } from '../dbus';

import { OverlayWindow, render } from './theme';
import { WifiIcon } from './wifi-icon';

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
	editConnection?: () => Promise<void>;
	connect?: () => void;
}

function passphraseRequired(ap: AccessPointProps) {
	return ap.RsnFlags !== 0 || ap.WpaFlags !== 0;
}

const AccessPointBox = styled(Flex)(({ active }: { active: boolean }) => ({
	backgroundColor: active ? '#f8f9fd' : undefined,
	height: '40px',
	borderRadius: '3px',
	width: '100%',
	alignItems: 'center',
	padding: '12px',
	fontSize: '16px',
	fontWeight: 600,
	marginLeft: '10px',
}));

class AccessPoint extends React.PureComponent<AccessPointProps> {
	public render() {
		const action = this.props.createConnection ?? this.props.connect;
		return (
			<Flex
				flexDirection="row"
				key={this.props.path}
				alignItems="center"
				onClick={() => {
					action?.();
				}}
				style={{ cursor: action !== undefined ? 'pointer' : 'default' }}
			>
				<WifiIcon
					percentage={this.props.Strength}
					disabled={false}
					style={{ width: '24px', height: '20px' }}
				/>
				<AccessPointBox active={this.props.active}>
					{passphraseRequired(this.props) ? (
						<LockSvg height="10px" width="11px" fill="currentColor" />
					) : (
						<Box width="11px" />
					)}
					<Txt marginLeft="12px">{this.props.Ssid.toString()}</Txt>
					{this.props.state !== undefined &&
					this.props.state !== NM_ACTIVE_CONNECTION_STATE.ACTIVATED ? (
						<Spinner marginLeft="12px" />
					) : undefined}
					{this.props.configured && (
						<Button
							icon={<WrenchSvg height="1em" fill="currentColor" />}
							light
							outline
							marginLeft="auto"
							color="#00aeef"
							onClick={() => {
								this.props.editConnection?.();
							}}
						>
							Configuration
						</Button>
					)}
				</AccessPointBox>
			</Flex>
		);
	}
}

interface WifiDeviceProps {
	AccessPoints: AccessPointProps[];
	ActiveAccessPoint: string;
	path: string;
	configuredWifiConnections: Map<string, DBusObjectNode>;
	connectionStates: Map<string, NM_ACTIVE_CONNECTION_STATE>;
	editConnection: (connection: DBusObjectNode) => Promise<void>;
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
						this.props.createConnection(ssid);
				  };
			const editConnection = configured
				? async () => {
						await this.props.editConnection(configuredConnection!);
				  }
				: undefined;
			const connect =
				configured && !active
					? () => {
							this.props.connect(configuredConnection!.path);
					  }
					: undefined;
			const state = this.props.connectionStates.get(ssid);
			return {
				...ap,
				active,
				configured,
				createConnection,
				editConnection,
				connect,
				state,
			};
		}).filter((ap) => ap.Ssid.toString() !== '');
		const sortedAccessPoints = _.orderBy(
			accessPoints,
			['active', 'Strength'],
			['desc', 'desc'],
		);
		const [activeAccessPoints, inactiveAccessPoints] = _.partition(
			sortedAccessPoints,
			'active',
		);

		return (
			<>
				{activeAccessPoints.map((ap: AccessPointProps) => {
					return <AccessPoint {...ap} />;
				})}
				{activeAccessPoints.length > 0 && (
					<Divider marginTop="15px" marginBottom="15px" />
				)}
				{inactiveAccessPoints.map((ap: AccessPointProps) => {
					return <AccessPoint {...ap} />;
				})}
			</>
		);
	}
}

async function reloadSettings(o: DBusObjectNode): Promise<void> {
	if (o.iface !== undefined) {
		o.state.Settings = await o.iface.GetSettings();
		o.emit('PropertiesChanged');
	}
}

async function reloadSecrets(o: DBusObjectNode): Promise<void> {
	if (o.iface !== undefined) {
		try {
			o.state.Secrets = await o.iface.GetSecrets('802-11-wireless-security');
		} catch (error) {
			// no secrets, do nothing
		}
		o.emit('PropertiesChanged');
	}
}

interface ActiveConnection {
	Connection: string;
	Devices: string[];
	State: NM_ACTIVE_CONNECTION_STATE;
}

interface WifiConfigState {
	ActiveConnections: ActiveConnection[];
	Devices: WifiDeviceProps[];
	WirelessEnabled: boolean;
	configuredWifiConnections: Map<string, DBusObjectNode>;
	connectionStates: Map<string, NM_ACTIVE_CONNECTION_STATE>;
	creatingConnection?: string; // ssid
	editingConnection?: DBusObjectNode;
}

class WifiConfig extends React.Component<{}, WifiConfigState> {
	private networkManagerSettings: DBusObjectNode;
	private networkManager: DBusObjectNode;
	public boundEditConnection: (connection: DBusObjectNode) => Promise<void>;
	public boundConnect: (connectionPath: string) => void;
	public boundCreateConnection: (ssid: string) => void;

	constructor(props: {}) {
		super(props);
		this.boundCreateConnection = this.createConnection.bind(this);
		this.boundConnect = this.connect.bind(this);
		this.boundEditConnection = this.editConnection.bind(this);
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
			const configuredWifiConnections: Map<string, DBusObjectNode> = new Map();
			for (const connection of this.networkManagerSettings.state.Connections.values()) {
				const ssid = connection.state.Settings['802-11-wireless']?.ssid?.value;
				if (ssid === undefined) {
					continue;
				}
				// This assumes there is only one settings object per ssid
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
				const connection = this.networkManagerSettings.state.Connections.get(
					ac.Connection,
				);
				if (connection !== undefined) {
					const ssid = connection.state.Settings[
						'802-11-wireless'
					]?.ssid?.value?.toString();
					connectionStates.set(ssid, ac.State);
				}
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
					interfaceName: 'org.freedesktop.NetworkManager.Settings.Connection',
					subtree: {},
					extraListeners: {
						// Commented out as it leads to
						// "The maximum number of pending replies per connection has been reached"
						// errors on some systems
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
						Connection: null,
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
								try {
									await o.iface.RequestScan({});
								} catch (error) {
									if (!ALLOWED_SCAN_ERRORS.includes(error.text)) {
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
			await this.networkManager.setProperty(
				'WirelessEnabled',
				new Variant('b', event.target.checked ? 1 : 0),
			);
		}
	}

	private async editConnection(connection: DBusObjectNode) {
		await reloadSecrets(connection);
		this.setState({ editingConnection: connection });
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
		const devicePath = this.state.Devices[0].path;
		await this.networkManager.iface.ActivateConnection(
			connectionPath,
			devicePath,
			'/',
		);
	}

	public render() {
		return (
			<OverlayWindow>
				{(() => {
					if (this.state.creatingConnection !== undefined) {
						return this.renderCreateConnection();
					} else if (this.state.editingConnection !== undefined) {
						return this.renderEditConnection(this.state.editingConnection);
					} else {
						return this.renderDevice();
					}
				})()}
			</OverlayWindow>
		);
	}

	private renderDevice() {
		const device = this.state.Devices[0];
		if (device) {
			return (
				<>
					<Flex flexDirection="row" alignItems="center">
						<Heading.h2>WiFi</Heading.h2>
						<Checkbox
							ml="31px"
							toggle
							label={this.state.WirelessEnabled ? 'On' : 'Off'}
							checked={this.state.WirelessEnabled}
							onChange={this.handleWirelessEnabledCheckbox.bind(this)}
						/>
					</Flex>
					<Flex
						flexDirection="column"
						height="calc(100vh - 120px)"
						style={{ overflowY: 'auto' }}
					>
						<WifiDevice
							{...device}
							configuredWifiConnections={this.state.configuredWifiConnections}
							connectionStates={this.state.connectionStates}
							editConnection={this.boundEditConnection}
							createConnection={this.boundCreateConnection}
							connect={this.boundConnect}
						/>
					</Flex>
					<Flex alignItems="center" justifyContent="center">
						<Button primary onClick={window.close} width="200px">
							Ok
						</Button>
					</Flex>
				</>
			);
		}
	}

	private getAccessPointBySsid(ssid: string): AccessPointProps {
		const device = this.state.Devices[0];
		return device.AccessPoints.filter((ap) => ap.Ssid.toString() === ssid)[0];
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
		const settings =
			passphrase === undefined
				? {}
				: { '802-11-wireless-security': { psk: new Variant('s', passphrase) } };
		return await this.networkManager.iface.AddAndActivateConnection(
			settings,
			device.path,
			accessPoint.path,
		);
	}

	private connectionIsActive(connectionPath: string) {
		return (
			this.state.ActiveConnections.find(
				(ac: { Connection: string }) => ac.Connection === connectionPath,
			) !== undefined
		);
	}

	private renderEditConnection(connection: DBusObjectNode) {
		const settings = _.merge(
			{},
			connection.state.Settings,
			connection.state.Secrets,
		);
		const ssid = settings['802-11-wireless'].ssid?.value?.toString();
		const passphrase = settings['802-11-wireless-security']?.psk?.value;
		// TODO: Other settings under "Advanced network configuration"
		return (
			<>
				<Button
					outline
					quartenary
					width="108px"
					icon={<ChevronLeftSvg height="1em" fill="currentColor" />}
					onClick={() => {
						this.setState({ editingConnection: undefined });
					}}
				>
					Back
				</Button>
				<Flex
					alignItems="center"
					marginTop="32px"
					marginBottom="16px"
					fontSize="18px"
				>
					<WifiIcon
						percentage={this.getAccessPointBySsid(ssid)?.Strength ?? 0}
						disabled={false}
						style={{ width: '24px', height: '20px' }}
					/>
					<Txt marginLeft="9px">{ssid}</Txt>
				</Flex>
				{settings.hasOwnProperty('802-11-wireless-security') && (
					<PasswordBox
						label={'WIFI passphrase'}
						okLabel={'Update'}
						value={passphrase}
						ok={async (value) => {
							settings['802-11-wireless-security'].psk = new Variant(
								's',
								value,
							);
							await connection.iface?.Update(settings);
							if (this.connectionIsActive(connection.path)) {
								// This assumes there is only one wireless interface
								// @ts-ignore
								const deviceInterface = Array.from(
									this.networkManager.state.Devices.values(),
								)[0].proxy.getInterface(
									'org.freedesktop.NetworkManager.Device',
								);
								await deviceInterface.Disconnect();
							}
							await this.connect(connection.path);
							// await deviceInterface.Reapply({}, 0, 0);
							this.setState({ editingConnection: undefined });
						}}
						cancel={() => {
							this.setState({ editingConnection: undefined });
						}}
					/>
				)}
				<Divider marginTop="15px" marginBottom="15px" />
				<Button
					width="100px"
					plain
					danger
					icon={<TimesSvg height="1em" fill="currentColor" />}
					onClick={async () => {
						await connection.iface?.Delete();
						this.setState({ editingConnection: undefined });
					}}
				>
					Forget network
				</Button>
			</>
		);
	}

	private renderCreateConnection() {
		const ssid = this.state.creatingConnection!;
		return (
			<>
				<Button
					outline
					quartenary
					width="108px"
					icon={<ChevronLeftSvg height="1em" fill="currentColor" />}
					onClick={() => {
						this.setState({ creatingConnection: undefined });
					}}
				>
					Back
				</Button>
				<Flex
					alignItems="center"
					marginTop="32px"
					marginBottom="16px"
					fontSize="18px"
				>
					<WifiIcon
						percentage={this.getAccessPointBySsid(ssid)?.Strength ?? 0}
						disabled={false}
						style={{ width: '24px', height: '20px' }}
					/>
					<Txt marginLeft="9px">{ssid}</Txt>
				</Flex>
				<PasswordBox
					label={'WIFI passphrase'}
					value=""
					okLabel="Connect"
					ok={async (value) => {
						await this.addAndActivateConnection(ssid, value);
					}}
					cancel={() => {
						this.setState({ creatingConnection: undefined });
					}}
				/>
			</>
		);
	}
}

interface PasswordBoxProps {
	label: string;
	okLabel: string;
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
				<Txt>{this.props.label}</Txt>
				<Flex flexDirection="row" alignItems="center" marginTop="9px">
					<Input
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
					<Checkbox
						id="show-passphrase"
						label="show"
						checked={this.state.showPassword}
						onChange={this.setShowPassword.bind(this)}
						marginLeft="16px"
					/>
					<Button
						marginLeft="16px"
						width="100px"
						onClick={() => {
							this.props.ok(this.state.value);
						}}
					>
						{this.props.okLabel}
					</Button>
				</Flex>
			</>
		);
	}

	private setShowPassword(event: React.ChangeEvent<HTMLInputElement>) {
		this.setState({ showPassword: event.target.checked });
	}
}

render(<WifiConfig />);
