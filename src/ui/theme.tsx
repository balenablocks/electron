import './fonts.css';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
	Button,
	Flex,
	Heading,
	Provider as BaseProvider,
	DefaultProps,
} from 'rendition';
import { default as styled } from 'styled-components';

const theme = {
	font: 'SourceSansPro',
};

export const Provider: React.FunctionComponent<DefaultProps> = (props) => (
	<BaseProvider theme={theme} {...props} />
);

const StickyFlex = styled(Flex)`
	position: sticky;
	top: 0px;
	background-color: white;
`;

export const CloseableWindow: React.FunctionComponent<{
	title: string;
}> = (props) => (
	<Provider>
		<StickyFlex justifyContent="space-between" alignItems="center">
			<Flex />
			<Heading.h2>{props.title}</Heading.h2>
			<Button onClick={window.close}>✖</Button>
		</StickyFlex>
		{props.children}
	</Provider>
);

export function render(element: JSX.Element) {
	ReactDOM.render(
		element,
		document.body.appendChild(document.createElement('div')),
	);
}
