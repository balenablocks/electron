import { parse } from 'querystring';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { screenOff } from '../screensaver';
import { OverlayIcon } from './overlay-icon';

const { icon } = parse(window.location.search.substring(1));

ReactDOM.render(
	<OverlayIcon
		icon={icon as string}
		onClick={() => {
			screenOff();
		}}
	/>,
	document.body,
);
