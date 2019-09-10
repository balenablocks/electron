import { ipcRenderer } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { screenOff } from '../screensaver';

class Sidebar extends React.Component {
	public render() {
		return (
			<>
				<h1>This is the sidebar!</h1>
				We are using node
				{process.versions.node}, Chrome
				{process.versions.chrome}
				and Electron
				{process.versions.electron}.
				<p>
					<a href="#" onClick={this.openWifiConfig}>
						Open wifi configuration panel
					</a>
				</p>
				<p>
					<a href="#" onClick={this.openSettings}>
						Open settings
					</a>
				</p>
				<p>
					<a href="#" onClick={screenOff}>
						Sleep
					</a>
				</p>
			</>
		);
	}

	private openWifiConfig() {
		ipcRenderer.send('show-window', 'wifi-config');
	}

	private openSettings() {
		ipcRenderer.send('show-window', 'settings');
	}
}

ReactDOM.render(<Sidebar />, document.body);
