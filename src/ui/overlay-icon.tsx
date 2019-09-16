import * as React from 'react';

export interface OverlayIconProps {
	icon: string;
	onClick: () => void;
}

export class OverlayIcon extends React.PureComponent<OverlayIconProps> {
	public render() {
		return (
			<div
				style={{
					borderRadius: '50%',
					backgroundColor: 'rgba(0,102,204,0.5)',
					width: '40px',
					height: '40px',
					lineHeight: '40px',
					textAlign: 'center',
					color: 'white',
					fontWeight: 'bold',
					userSelect: 'none',
					cursor: 'pointer',
				}}
				onClick={this.props.onClick.bind(this)}
			>
				{this.props.icon}
			</div>
		);
	}
}
