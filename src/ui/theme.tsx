import './fonts.css';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
	Button,
	DefaultProps,
	Flex,
	Heading,
	Provider as BaseProvider,
} from 'rendition';

const theme = {
	font: 'SourceSansPro',
};

export const Provider: React.FunctionComponent<DefaultProps> = (props) => (
	<BaseProvider theme={theme} {...props} />
);

export const CloseableWindow: React.FunctionComponent<{
	title: string;
}> = (props) => (
	<Provider>
		<Flex justifyContent="space-between">
			<Flex />
			<Heading.h2>{props.title}</Heading.h2>
			<Button onClick={window.close}>✖</Button>
		</Flex>
		{props.children}
	</Provider>
);

export function render(element: JSX.Element) {
	ReactDOM.render(
		element,
		document.body.appendChild(document.createElement('div')),
	);
}
