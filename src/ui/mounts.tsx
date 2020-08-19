import * as _ from 'lodash';
import * as React from 'react';
import { Button, Table, TableColumn } from 'rendition';

import { Partition, startWatching } from '../mounts';
import { CloseableWindow, render } from './theme';

interface MountsState {
	partitions: Map<string, Partition>;
	methods?: {
		mount: (partition: Partition) => Promise<void>;
		umount: (partition: Partition) => Promise<void>;
		stopWatching: () => void;
	};
}

class MountsWindow extends React.Component<{}, MountsState> {
	constructor(props: {}) {
		super(props);
		this.state = {
			partitions: new Map(),
		};
		this.init();
	}

	private async init() {
		const methods = await startWatching((partitions) => {
			this.setState({ partitions });
		});
		this.setState({ methods });
	}

	public componentWillUnmount() {
		if (this.state.methods !== undefined) {
			this.state.methods.stopWatching();
		}
	}

	private getPartitions(): Partition[] {
		return _.sortBy(Array.from(this.state.partitions.values()), 'path');
	}

	public render() {
		const columns: Array<TableColumn<Partition>> = [
			{
				field: 'path',
				label: 'Device Path',
			},
			{
				field: 'device',
				label: 'Device',
			},
			{
				field: 'mountpoint',
				label: 'Mountpoint',
			},
			{
				field: 'info',
				label: 'Label',
				key: 'idFsLabel',
				render: (info) => info.idFsLabel,
			},
			{
				field: 'info',
				label: 'UUID',
				key: 'idFsUuid',
				render: (info) => info.idFsUuid,
			},
			{
				field: 'info',
				label: 'Type',
				key: 'idFstype',
				render: (info) => info.idFsType,
			},
			{
				field: 'mountpoint',
				key: 'action',
				label: 'Action',
				render: (_mountpoint: string, partition: Partition) => {
					if (this.state.methods === undefined) {
						return;
					}
					const action = partition.mountpoint
						? this.state.methods.umount.bind(this, partition)
						: this.state.methods.mount.bind(this, partition);
					const buttonLabel = partition.mountpoint ? 'umount' : 'mount';
					return <Button onClick={action}>{buttonLabel}</Button>;
				},
			},
		];
		return (
			<CloseableWindow title="Available partitions">
				<Table columns={columns} data={this.getPartitions()}></Table>
			</CloseableWindow>
		);
	}
}

render(<MountsWindow />);
