import { remote } from 'electron';
import { join } from 'path';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

class Sidebar extends React.Component {
	public render() {
		return (
			<React.Fragment>
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
			</React.Fragment>
		);
	}

	public openWifiConfig() {
		const win = new remote.BrowserWindow({
			frame: false,
			webPreferences: {
				nodeIntegration: true,
			},
		});
		win.loadFile(join(__dirname, 'wifi-config.html'));
	}
}

ReactDOM.render(<Sidebar />, document.body);
