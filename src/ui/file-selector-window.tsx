import { ipcRenderer, OpenDialogOptions } from 'electron';
import { env } from 'process';
import { parse } from 'querystring';
import * as React from 'react';

import { FileSelector } from './file-selector/file-selector';
import { OverlayWindow, render } from './theme';

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

render(
	<OverlayWindow>
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
			constraintPath={env.BALENAELECTRONJS_CONSTRAINT_PATH}
		/>
	</OverlayWindow>,
);
