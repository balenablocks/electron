import { ipcRenderer } from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

class FilePicker extends React.Component {
	public render() {
		return (
			<React.Fragment>
				<h1>This is the sidebar!</h1>
				<button onClick={this.selectFile}>Select File</button>
			</React.Fragment>
		);
	}

	public selectFile() {
		const path = '/some/file';
		ipcRenderer.send('select-file', [path]);
		window.close();
	}
}

ReactDOM.render(<FilePicker />, document.body);
