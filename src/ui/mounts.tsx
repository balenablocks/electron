import * as _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Button, Provider, Table, TableColumn } from 'rendition';

import { Partition, startWatching } from '../mounts';

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
		const methods = await startWatching(partitions => {
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
				render: info => info.idFsLabel,
			},
			{
				field: 'info',
				label: 'UUID',
				render: info => info.idFsUuid,
			},
			{
				field: 'info',
				label: 'Type',
				render: info => info.idFsType,
			},
			{
				field: 'mountpoint',
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
			<Provider>
				<h1>Available partitions:</h1>
				<button onClick={window.close}>Close</button>
				<Table columns={columns} data={this.getPartitions()}></Table>
			</Provider>
		);
	}
}

ReactDOM.render(<MountsWindow />, document.body);
