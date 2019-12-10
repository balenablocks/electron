import { ipcRenderer, OpenDialogOptions } from 'electron';
import { env } from 'process';
import { parse } from 'querystring';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { FileSelector } from './file-selector/file-selector';

// Required for FileSelector icons (fa-folder, fa-file-alt, fa-hdd and fa-angle-left)
import '@fortawesome/fontawesome-free/css/all.css';

// TODO: respect OpenDialogOptions:
// * title
// * filters
// * properties (for now only openFile is supported)
// * message

function identityIfString(value: any): string | undefined {
	if (typeof value === 'string') {
		return value;
	}
}

function parseOpenDialogOptions(): OpenDialogOptions {
	const opts = parse(window.location.search.substring(1));
	return {
		title: identityIfString(opts.title),
		defaultPath: identityIfString(opts.defaultPath),
		buttonLabel: identityIfString(opts.buttonLabel),
		message: identityIfString(opts.message),
	};
}

const options = parseOpenDialogOptions();

let canceled = true;
let filePaths: string[] = [];

window.addEventListener('beforeunload', () => {
	ipcRenderer.send('select-files', { canceled, filePaths });
});

ReactDOM.render(
	<FileSelector
		defaultPath={options.defaultPath || '/'}
		buttonLabel={options.buttonLabel}
		selectFiles={(files?: string[]) => {
			if (files !== undefined) {
				canceled = false;
				filePaths = files;
			}
			window.close();
		}}
		constraintPath={env.BALENA_ELECTRONJS_CONSTRAINT_PATH}
	/>,
	document.body,
);
