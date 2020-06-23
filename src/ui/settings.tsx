import * as electron from 'electron';
import * as React from 'react';
import { Form } from 'rendition/dist/unstable';

import { CloseableWindow, render } from './theme';

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
			<CloseableWindow title="Settings">{this.renderForm()}</CloseableWindow>
		);
	}

	private renderForm() {
		return (
			<Form
				hideSubmitButton
				schema={this.state.schema}
				value={this.state.data}
				onFormChange={(newState) => {
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

render(<SettingsWindow />);
