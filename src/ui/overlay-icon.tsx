import * as React from 'react';
import './fonts.css';

export interface OverlayIconProps {
	icon: string | JSX.Element;
	text?: string;
	onClick: () => void;
}

export class OverlayIcon extends React.PureComponent<OverlayIconProps> {
	public render() {
		return (
			<div
				style={{
					borderRadius: '50vh',
					backgroundColor: '#3c3e42',
					width: '100%',
					height: '100vh',
					fontSize: '14px',
					userSelect: 'none',
					cursor: 'pointer',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					color: '#d3d6db',
					fontWeight: 600,
				}}
				onClick={this.props.onClick.bind(this)}
			>
				{this.props.icon}
				{this.renderText()}
			</div>
		);
	}

	private renderText() {
		if (this.props.text) {
			return (
				<>
					&nbsp;
					<span
						style={{
							color: '#75777a',
						}}
					>
						{this.props.text}
					</span>
				</>
			);
		}
	}
}
