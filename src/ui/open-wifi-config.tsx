import { ipcRenderer } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { DBusObjectNode } from '../dbus';

import { WifiIcon, WifiIconProps } from './wifi-icon';

import './open-wifi-config.css';

export class WifiStatusIcon extends React.PureComponent<{}, WifiIconProps> {
	constructor(props: {}) {
		super(props);
		this.state = { disabled: true, percentage: 0 };
		this.init();
	}

	private async init() {
		const networkManager = await DBusObjectNode.create(
			'org.freedesktop.NetworkManager',
			'org.freedesktop.NetworkManager',
			'/org/freedesktop/NetworkManager',
			{
				Devices: {
					interfaceName: 'org.freedesktop.NetworkManager.Device.Wireless',
					subtree: {
						AccessPoints: {
							interfaceName: 'org.freedesktop.NetworkManager.AccessPoint',
							subtree: {
								Strength: null,
							},
						},
						ActiveAccessPoint: null,
					},
				},
				WirelessEnabled: null,
			},
		);
		networkManager.on('PropertiesChanged', () => {
			const state: WifiIconProps = { disabled: true, percentage: 0 };
			const dump = networkManager.dump();
			state.disabled = !dump.WirelessEnabled;
			if (!state.disabled) {
				const device = dump.Devices[0];
				const accessPointPath = device.ActiveAccessPoint;
				if (accessPointPath !== undefined) {
					const accessPoint = device.AccessPoints.find(
						(ap: { path?: string }) => ap.path === accessPointPath,
					);
					if (accessPoint !== undefined) {
						state.percentage = accessPoint.Strength;
					}
				}
			}
			this.setState(state);
		});
	}

	public render() {
		return <WifiIcon {...this.state} />;
	}
}

ReactDOM.render(
	<div
		style={{
			userSelect: 'none',
			cursor: 'pointer',
		}}
		onClick={() => {
			ipcRenderer.send('show-window', 'wifi-config');
		}}
	>
		<WifiStatusIcon />
	</div>,
	document.body,
);
