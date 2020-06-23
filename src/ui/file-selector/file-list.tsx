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

import * as debug_ from 'debug';
import * as prettyBytes from 'pretty-bytes';
import * as React from 'react';
import { default as styled } from 'styled-components';

import { colors } from './colors';
import { FileEntry, readdir } from './files';
import { middleEllipsis } from './middle-ellipsis';

const debug = debug_('balena-electronjs:file-selector');

const FILENAME_CHAR_LIMIT = 20;

interface FlexProps {
	flex?: string;
	direction?: string;
	justifyContent?: string;
	alignItems?: string;
	wrap?: string;
	grow?: string;
}

const Flex = styled.div<FlexProps>`
	display: flex;
	flex: ${(props) => props.flex};
	flex-direction: ${(props) => props.direction};
	justify-content: ${(props) => props.justifyContent};
	align-items: ${(props) => props.alignItems};
	flex-wrap: ${(props) => props.wrap};
	flex-grow: ${(props) => props.grow};
`;

const ClickableFlex = styled.a<FlexProps>`
	display: flex;
	flex: ${(props) => props.flex};
	flex-direction: ${(props) => props.direction};
	justify-content: ${(props) => props.justifyContent};
	align-items: ${(props) => props.alignItems};
	flex-wrap: ${(props) => props.wrap};
	flex-grow: ${(props) => props.grow};
`;

interface FileListWrapProps {
	className?: string;
}

class UnstyledFileListWrap extends React.PureComponent<FileListWrapProps> {
	public render() {
		return (
			<Flex className={this.props.className} wrap="wrap">
				{this.props.children}
			</Flex>
		);
	}
}

const FileListWrap = styled(UnstyledFileListWrap)`
	overflow-x: hidden;
	overflow-y: auto;
	padding: 0 20px;
`;

interface FileProps {
	onSelect: (file: FileEntry) => void;
	onHighlight: (file: FileEntry) => void;
	file: FileEntry;
	className?: string;
}

class UnstyledFile extends React.PureComponent<FileProps> {
	private static getFileIconClass(file: FileEntry) {
		return file.isDirectory ? 'fas fa-folder' : 'fas fa-file-alt';
	}

	private onHighlight(event: React.MouseEvent) {
		event.preventDefault();
		this.props.onHighlight(this.props.file);
	}

	private onSelect(event: React.MouseEvent) {
		event.preventDefault();
		this.props.onSelect(this.props.file);
	}

	public render() {
		const file = this.props.file;
		return (
			<ClickableFlex
				data-path={file.path}
				href={`file://${file.path}`}
				direction="column"
				alignItems="stretch"
				className={this.props.className}
				onClick={this.onHighlight.bind(this)}
				onDoubleClick={this.onSelect.bind(this)}
			>
				<span className={UnstyledFile.getFileIconClass(file)} />
				<span>{middleEllipsis(file.basename, FILENAME_CHAR_LIMIT)}</span>
				<div>{file.isDirectory ? '' : prettyBytes(file.size || 0)}</div>
			</ClickableFlex>
		);
	}
}

const File = styled(UnstyledFile)<{ disabled: boolean }>`
	width: 100px;
	min-height: 100px;
	max-height: 128px;
	margin: 5px 10px;
	padding: 5px;
	background-color: none;
	transition: 0.05s background-color ease-out;
	color: ${colors.primary.color};
	cursor: pointer;
	border-radius: 5px;
	word-break: break-word;

	> span:first-of-type {
		align-self: center;
		line-height: 1;
		margin-bottom: 6px;
		font-size: 48px;
		color: ${(props) =>
			props.disabled ? colors.primary.faded : colors.soft.color};
	}

	> span:last-of-type {
		display: flex;
		justify-content: center;
		text-align: center;
		font-size: 14px;
	}

	> div:last-child {
		background-color: none;
		color: ${colors.primary.subColor};
		text-align: center;
		font-size: 12px;
	}

	:hover,
	:visited {
		color: ${colors.primary.color};
	}

	:focus,
	:active {
		color: ${colors.highlight.color};
		background-color: ${colors.highlight.background};
	}

	:focus > span:first-of-type,
	:active > span:first-of-type {
		color: ${colors.highlight.color};
	}

	:focus > div:last-child,
	:active > div:last-child {
		color: ${colors.highlight.color};
	}
`;

interface FileListProps {
	path: string;
	onHighlight: (file: FileEntry) => void;
	onSelect: (file: FileEntry) => void;
	showHiddenFiles: boolean;
}

interface FileListState {
	path: string;
	files: FileEntry[];
}

export class FileList extends React.Component<FileListProps, FileListState> {
	constructor(props: FileListProps) {
		super(props);

		this.state = {
			path: props.path,
			files: [],
		};

		debug('FileList', props);
	}

	private async readdir(dirname: string) {
		debug('FileList:readdir', dirname);
		const files = await readdir(dirname);
		window.requestAnimationFrame(() => {
			this.setState({ files });
		});
	}

	public componentDidMount() {
		process.nextTick(() => {
			this.readdir(this.state.path);
		});
	}

	private onHighlight(file: FileEntry) {
		debug('FileList:onHighlight', file);
		this.props.onHighlight(file);
	}

	private onSelect(file: FileEntry) {
		debug('FileList:onSelect', file.path, file.isDirectory);
		this.props.onSelect(file);
	}

	public shouldComponentUpdate(
		nextProps: FileListProps,
		nextState: FileListState,
	) {
		const shouldUpdate =
			this.state.files !== nextState.files ||
			this.props.showHiddenFiles !== nextProps.showHiddenFiles;
		debug('FileList:shouldComponentUpdate', shouldUpdate);
		if (this.props.path !== nextProps.path) {
			process.nextTick(() => {
				this.readdir(nextProps.path);
			});
		}
		return shouldUpdate;
	}

	private static isSelectable(_file: FileEntry) {
		return true;
	}

	public render() {
		let files = this.state.files;
		if (!this.props.showHiddenFiles) {
			files = files.filter((f) => !f.isHidden);
		}
		return (
			<FileListWrap>
				{files.map((file) => {
					return (
						<File
							key={file.path}
							file={file}
							disabled={!FileList.isSelectable(file)}
							onSelect={this.onSelect.bind(this)}
							onHighlight={this.onHighlight.bind(this)}
						/>
					);
				})}
			</FileListWrap>
		);
	}
}
