import * as electron from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'rendition';
import { Form } from 'rendition/dist/unstable';

interface SettingsState {
	schema: any;
	data: any;
}

class SettingsWindow extends React.Component<{}, SettingsState> {
	private settings = electron.remote.getGlobal('BALENA_ELECTRONJS_SETTINGS');

	constructor(props: {}) {
		super(props);
		this.state = {
			schema: {},
			data: {},
		};
		this.init();
	}

	private async init() {
		const schema = await this.settings.getSchema();
		const data = await this.settings.getData();
		this.setState({ schema, data });
		this.settings.on('change', async () => {
			this.setState({ data: await this.settings.getData() });
		});
	}

	public render() {
		return (
			<Provider>
				<h1>These are the settings!</h1>
				<button onClick={window.close}>Close</button>
				{this.renderForm()}
			</Provider>
		);
	}

	private renderForm() {
		if (this.state.schema !== undefined && this.state.data !== undefined) {
			return (
				<Form
					hideSubmitButton={true}
					schema={this.state.schema}
					value={this.state.data}
					onFormChange={newState => {
						for (const key of Object.keys(newState.formData)) {
							const oldValue = this.state.data[key];
							const newValue = newState.formData[key];
							if (newValue !== oldValue) {
								this.settings.set(key, newValue);
							}
						}
					}}
				/>
			);
		}
	}
}

ReactDOM.render(<SettingsWindow />, document.body);
