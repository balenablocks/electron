const electron = require('electron');
const React = require('react');
const ReactDOM = require('react-dom');
const Form = require('react-jsonschema-form').default;

const SETTINGS = electron.remote.getGlobal('BALENA_ELECTRONJS_SETTINGS');

const currentWindow = electron.remote.getCurrentWindow()

document.getElementById('choose-file').onclick = async () => {
	const { canceled, filePaths } = await electron.remote.dialog.showOpenDialog(
		currentWindow,
		{
			buttonLabel: 'Wololo!',
			defaultPath: '/home',
			properties: [ 'openFile' ],
		},
	);
	console.log('filePaths', filePaths, canceled);
};

document.getElementById('mount-drive-button').onclick = async () => {
	try {
		const result = await electron.ipcRenderer.invoke(
			'mount-drive',
			document.getElementById('mount-drive-input').value
		);
		console.log('mount-drive result', result);
	} catch (error) {
		console.log('mount-drive error', error);
	}
};

async function renderForm(schema, data) {
	const form = React.createElement(
		Form,
		{
			schema,
			formData: data,
			onChange: async ({ formData }) => {
				for (const [ key, value ] of Object.entries(formData)) {
					const oldValue = form.props.formData[key];
					if (value !== oldValue) {
						await SETTINGS.set(key, value);
					}
				}
			},
			onError: console.error,
		},
		null,
	);
	ReactDOM.render(form, document.getElementById('form-container'));
}

async function init() {
	const schema = await SETTINGS.getSchema();
	const data = await SETTINGS.getData();
	renderForm(schema, data);
	SETTINGS.on('change', async () => {
		const newData = await SETTINGS.getData();
		renderForm(schema, newData);
	});
}

init();
