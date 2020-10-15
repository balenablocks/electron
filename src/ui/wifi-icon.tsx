import * as React from 'react';

const ACTIVE_COLOR = '#1ac135';
const INACTIVE_COLOR = '#2f3033';

export interface WifiIconProps {
	percentage: number;
	disabled: boolean;
	style?: any; // TODO
}

type BarNumber = 1 | 2 | 3 | 4;

export class WifiIcon extends React.PureComponent<WifiIconProps> {
	private barColor(barNumber: BarNumber) {
		const level = Math.ceil((this.props.percentage / 100) * 4);
		return !this.props.disabled && barNumber <= level
			? ACTIVE_COLOR
			: INACTIVE_COLOR;
	}

	private barProps(barNumber: BarNumber) {
		const result: { fill: string; mask?: string } = {
			fill: this.barColor(barNumber),
		};
		if (this.props.disabled) {
			result.mask = 'url(#diagonal-mask)';
		}
		return result;
	}

	public render() {
		return (
			<svg width="28" height="24" viewBox="0 0 28 24" style={this.props.style}>
				<defs>
					<path id="diagonal" d="M 0 22 L 26 0 L 28 2 L 2 24 Z" />
					<mask id="diagonal-mask">
						<rect x="0" y="0" width="28" height="24" fill="white" />
						<use href="#diagonal" transform="translate(0, 2)" fill="black" />
					</mask>
				</defs>
				<path
					d="m 0,7.9533629 1.529,1.526 c 3.46,-3.394 7.596,-5.225 12.47,-5.225 4.876,0 9.014,1.831 12.467,5.225 L 28,7.9363629 C 19.804,-0.36263711 7,0.56736289 0,7.9533629"
					{...this.barProps(4)}
				/>
				<path
					d="m 3.867,11.811363 1.531,1.535 c 2.383,-2.36 5.242,-3.6260001 8.602,-3.6300001 3.36,-0.002 6.224,1.2670001 8.602,3.6210001 l 1.534,-1.534 C 18.511,5.9563629 9.117,6.2453629 3.866,11.811363"
					{...this.barProps(3)}
				/>
				<path
					d="m 7.736,15.672363 1.532,1.532 c 2.503,-2.616 6.652,-2.707 9.268,-0.205 0.07,0.067 0.138,0.135 0.204,0.205 l 1.538,-1.537 c -3.733,-3.856 -9.568,-3.273 -12.542,0.005"
					{...this.barProps(2)}
				/>
				<path
					d="m 11.595,19.539363 2.405,2.403 2.408,-2.405 c -1.182,-1.33 -3.218,-1.448 -4.546,-0.265 -0.094,0.083 -0.184,0.173 -0.267,0.267"
					{...this.barProps(1)}
				/>
				{this.props.disabled && <use href="#diagonal" fill={INACTIVE_COLOR} />}
			</svg>
		);
	}
}
