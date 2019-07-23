import * as React from 'react';
import * as ReactDOM from 'react-dom';

class WifiConfig extends React.Component {
	public render() {
		return (
			<React.Fragment>
				<h1>This is the wifi config!</h1>
				We are using node
				{process.versions.node}, Chrome
				{process.versions.chrome}
				and Electron
				{process.versions.electron}.
			</React.Fragment>
		);
	}
}

ReactDOM.render(<WifiConfig />, document.body);
