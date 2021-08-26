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

import AngleLeft from '@fortawesome/fontawesome-free/svgs/solid/angle-left.svg';
import Hdd from '@fortawesome/fontawesome-free/svgs/solid/hdd.svg';
import SourceSvg from './src.svg';
import * as debug_ from 'debug';
// import { promises as fs, readdirSync } from 'fs';
import { dirname, relative } from 'path';
import * as React from 'react';
import { Button, Flex } from 'rendition';
import { default as styled } from 'styled-components';
// import { AnimationFunction, Color, RGBLed } from 'sys-class-rgb-led';

import { colors } from './colors';
import { FileList } from './file-list';
import { FileEntry } from './files';
import { Breadcrumbs } from './path-breadcrumbs';

const debug = debug_('balena-electron-env:file-selector');

const Header = styled.div`
	flex: 0 0 auto;
	display: flex;
	align-items: baseline;
	padding: 10px 15px 0;
	border-bottom: 1px solid ${colors.primary.faded};

	> * {
		margin: 5px;
	}
`;

const Main = styled.div`
	flex: 1 1 auto;
	position: relative;
	overflow-y: auto;
`;

const Footer = styled.div`
	flex: 0 0 auto;
	display: flex;
	justify-content: center;
	padding: 10px;
	flex: 0 0 auto;
	border-top: 1px solid ${colors.primary.faded};

	> * {
		margin: 0 10px;
	}

	> button {
		flex-grow: 0;
		flex-shrink: 0;
	}
`;

interface FilePathProps {
	className?: string;
	file?: FileEntry;
}

class UnstyledFilePath extends React.PureComponent<FilePathProps> {
	public render() {
		return (
			<div className={this.props.className}>
				<span>
					{this.props.file && !this.props.file.isDirectory
						? this.props.file.basename
						: ''}
				</span>
			</div>
		);
	}
}

const FilePath = styled(UnstyledFilePath)`
	display: flex;
	flex-grow: 1;
	align-items: center;
	overflow: hidden;

	> span {
		font-size: 16px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

interface FileSelectorProps {
	buttonLabel?: string;
	defaultPath: string;
	constraintPath?: string;
	selectFiles: (files?: string[]) => void;
	sourceCheckTimeout: number;
}

interface FileSelectorState {
	highlighted?: FileEntry;
	path: string;
	showHiddenFiles: boolean;
	pathMounted: boolean;
}

export class FileSelector extends React.PureComponent<
	FileSelectorProps,
	FileSelectorState
> {
	checkSourceTimerID: number;

	constructor(props: FileSelectorProps) {
		super(props);

		const path = props.constraintPath || props.defaultPath;
		const pathMounted = true; // readdirSync(path).length > 0 || false;

		this.state = {
			path,
			showHiddenFiles: false,
			pathMounted,
		};
	}

	private confirmSelection() {
		if (this.state.highlighted) {
			this.selectFile(this.state.highlighted);
		}
	}

	private pathIsInConstraintPath(newPath: string) {
		if (this.props.constraintPath) {
			return !relative(this.props.constraintPath, newPath).startsWith('..');
		}
		return true;
	}

	private navigate(newPath: string) {
		debug('FileSelector:navigate', newPath);
		if (this.pathIsInConstraintPath(newPath)) {
			this.setState({ path: newPath });
		}
	}

	private navigateUp() {
		this.navigate(dirname(this.state.path));
	}

	private selectFile(file: FileEntry) {
		debug('FileSelector:selectFile', file);

		if (file.isDirectory) {
			this.navigate(file.path);
		} else {
			this.props.selectFiles([file.path]);
		}
	}

	private onHighlight(file: FileEntry) {
		this.setState({ highlighted: file });
	}

	// TODO: debug why nodejs returns the same folders when changing USBs
	// componentDidMount() {
	// 	this.checkSourceTimerID = setInterval(async (path: string) => {
	// 		const mountedFolders = await fs.readdir(path);
	// 		if (mountedFolders.length > 0) {
	// 			this.setState({ pathMounted: true });
	// 		} else {
	// 			setLeds(blinkBlue, 1);
	// 			this.setState({ pathMounted: false });
	// 		}
	// 	}, this.props.sourceCheckTimeout, this.state.path);
	// }

	componentWillUnmount() {
		clearInterval(this.checkSourceTimerID);
	}

	public render() {
		return this.state.pathMounted ? (
			<>
				<Header>
					<Button
						bg={colors.secondary.background}
						color={colors.primary.color}
						onClick={this.navigateUp.bind(this)}
					>
						<AngleLeft height="1em" fill="currentColor" />
						&nbsp;Back
					</Button>
					<Hdd height="1em" fill="currentColor" />
					<Breadcrumbs
						path={this.state.path}
						navigate={this.navigate.bind(this)}
					/>
				</Header>
				<Main>
					<FileList
						path={this.state.path}
						onHighlight={this.onHighlight.bind(this)}
						onSelect={this.selectFile.bind(this)}
						showHiddenFiles={this.state.showHiddenFiles}
					></FileList>
				</Main>
				<Footer>
					<input
						type="checkbox"
						checked={this.state.showHiddenFiles}
						onChange={() => {
							this.setState({ showHiddenFiles: !this.state.showHiddenFiles });
						}}
					/>
					Show hidden files
					<FilePath file={this.state.highlighted}></FilePath>
					<Button
						onClick={() => {
							this.props.selectFiles();
						}}
					>
						Cancel
					</Button>
					<Button primary onClick={this.confirmSelection.bind(this)}>
						{this.props.buttonLabel || 'Select file'}
					</Button>
				</Footer>
			</>
		) : (
			<>
				<Main>
					<Flex
						flexDirection="column"
						justifyContent="center"
						alignItems="center"
						width="100%"
						height="100%"
					>
						<SourceSvg height="4em" fill="currentColor" />
						<b>Plug a source drive</b>
					</Flex>
				</Main>
				<Footer>
					<Button
						onClick={() => {
							this.props.selectFiles();
						}}
					>
						Cancel
					</Button>
				</Footer>
			</>
		);
	}
}

// function createAnimationFunction(
// 	intensityFunction: (t: number) => number,
// 	color: Color,
// ): AnimationFunction {
// 	return (t: number): Color => {
// 		const intensity = intensityFunction(t);
// 		return color.map((v: number) => v * intensity) as Color;
// 	};
// }

// function blink(t: number) {
// 	return Math.floor(t) % 2;
// }

// const blue: Color = [0, 0, 0.1];

// const blinkBlue = createAnimationFunction(blink, blue);

// function setLeds(animation: AnimationFunction, led: number) {
// 	const rgbLeds: RGBLed[] = [
// 		new RGBLed([`led${led}_r`, `led${led}_g`, `led${led}_b`]),
// 	];
// 	return { animation, rgbLeds };
// }
