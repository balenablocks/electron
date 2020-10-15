import Moon from '@fortawesome/fontawesome-free/svgs/regular/moon.svg';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { screenOff } from '../screensaver';
import { OverlayIcon } from './overlay-icon';

ReactDOM.render(
	<OverlayIcon
		icon={<Moon height="1em" fill="#d3d6db" />}
		text="Sleep"
		onClick={() => {
			screenOff();
		}}
	/>,
	document.body,
);
