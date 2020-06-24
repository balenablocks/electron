/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { basename, join, parse } from 'path';
import * as React from 'react';
import Button from 'rendition/dist_esm5/components/Button';
import Txt from 'rendition/dist_esm5/components/Txt';
import { default as styled } from 'styled-components';

import { middleEllipsis } from './middle-ellipsis';

// How many directories to show with the breadcrumbs
const MAX_DIR_CRUMBS = 3;

// Character limit of a filename before a middle-ellipsis is added
const FILENAME_CHAR_LIMIT_SHORT = 15;

function splitComponents(dirname: string, root?: string) {
	const components = [];
	let baseName = null;
	root = root || parse(dirname).root;
	while (dirname !== root) {
		baseName = basename(dirname);
		components.unshift({
			path: dirname,
			basename: baseName,
			name: baseName,
		});
		dirname = join(dirname, '..');
	}
	if (components.length < MAX_DIR_CRUMBS) {
		components.unshift({
			path: root,
			basename: root,
			name: 'Root',
		});
	}
	return components;
}

interface CrumbProps {
	bold?: boolean;
	dir: {
		name: string;
		path: string;
	};
	navigate: (path: string) => void;
}

class Crumb extends React.PureComponent<CrumbProps> {
	public render() {
		return (
			<Button onClick={this.navigate.bind(this)} plain={true}>
				<Txt bold={this.props.bold}>
					{middleEllipsis(this.props.dir.name, FILENAME_CHAR_LIMIT_SHORT)}
				</Txt>
			</Button>
		);
	}

	private navigate() {
		this.props.navigate(this.props.dir.path);
	}
}

interface BreadcrumbsProps {
	path: string;
	className?: string;
	navigate: (path: string) => void;
}

class UnstyledBreadcrumbs extends React.PureComponent<BreadcrumbsProps> {
	public render() {
		const components = splitComponents(this.props.path).slice(-MAX_DIR_CRUMBS);
		return (
			<div className={this.props.className}>
				{components.map((dir, index) => {
					return (
						<Crumb
							key={dir.path}
							bold={index === components.length - 1}
							dir={dir}
							navigate={this.props.navigate}
						/>
					);
				})}
			</div>
		);
	}
}

export const Breadcrumbs = styled(UnstyledBreadcrumbs)`
	font-size: 18px;

	& > button:not(:last-child)::after {
		content: '/';
		margin: 9px;
	}
`;
