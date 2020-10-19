import './fonts.css';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
	Button,
	FlexProps,
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

export const CloseableWindow: React.FunctionComponent<{
	title: string;
}> = (props) => (
	<OverlayWindow>
		<Flex justifyContent="space-between" alignItems="center" height="50px">
			<Flex />
			<Heading.h2>{props.title}</Heading.h2>
			<Button onClick={window.close}>✖</Button>
		</Flex>
		<Flex
			height="calc(100vh - 50px)"
			width="100%"
			flexDirection="column"
			style={{ overflowY: 'auto' }}
		>
			{props.children}
		</Flex>
	</OverlayWindow>
);

const WithMargins = styled(Flex)(() => ({
	marginTop: '50px',
	marginLeft: '10px',
	marginRight: '10px',
	height: 'calc(100vh - 60px)',
	backgroundColor: 'white',
	borderRadius: '7px',
	paddingLeft: '28px',
	paddingRight: '28px',
	paddingTop: '14px',
	paddingBottom: '10px',
	flexDirection: 'column' as const,
	boxShadow: '0px 0px 7px 0px #666',
}));

export const OverlayWindow: React.FunctionComponent<FlexProps> = (props) => (
	<BaseProvider theme={theme}>
		<WithMargins {...props}>{props.children}</WithMargins>
	</BaseProvider>
);

export function render(element: JSX.Element) {
	ReactDOM.render(element, document.body);
}
