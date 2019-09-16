import { ipcRenderer } from 'electron';
import { parse } from 'querystring';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { OverlayIcon } from './overlay-icon';

const { icon, opens } = parse(window.location.search.substring(1));

ReactDOM.render(
	<OverlayIcon
		icon={icon as string}
		onClick={() => {
			ipcRenderer.send('show-window', opens);
		}}
	/>,
	document.body,
);
