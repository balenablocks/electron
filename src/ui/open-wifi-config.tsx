import { ipcRenderer } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { DBusObjectNode } from '../dbus';

import { WifiIcon, WifiIconProps } from './wifi-icon';

import './open-wifi-config.css';
import { Dict } from '../utils';
import * as _ from 'lodash';

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
			let state: WifiIconProps = { disabled: true, percentage: 0 };
			const dump = networkManager.dump();
			state.disabled = !dump.WirelessEnabled;
			if (!state.disabled) {
				state = this.updateNetworkState(dump, state);
			}
			this.setState(state);
		});
	}

	private updateNetworkState(dump: Dict<any>, state: WifiIconProps) {
		const newState = _.cloneDeep(state);
		const device = dump.Devices[0];
		const accessPointPath = device.ActiveAccessPoint;
		if (accessPointPath !== undefined) {
			const accessPoint = device.AccessPoints.find(
				(ap: { path?: string }) => ap.path === accessPointPath,
			);
			if (accessPoint !== undefined) {
				newState.percentage = accessPoint.Strength;
			}
		}
		return newState;
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
