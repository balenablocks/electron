import { ipcRenderer, OpenDialogOptions } from 'electron';
import { env } from 'process';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { parse } from 'querystring';

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
	const options = parse(window.location.search.substring(1));
	return {
		title: identityIfString(options.title),
		defaultPath: identityIfString(options.defaultPath),
		buttonLabel: identityIfString(options.buttonLabel),
		message: identityIfString(options.message),
	}
}

const options = parseOpenDialogOptions();

ReactDOM.render(
	<FileSelector
		defaultPath={options.defaultPath || '/'}
		buttonLabel={options.buttonLabel}
		selectFiles={(files?: string[]) => {
			ipcRenderer.send('select-files', files);
			window.close();
		}}
		constraintPath={env.BALENA_ELECTRONJS_CONSTRAINT_PATH}
	/>,
	document.body,
);
