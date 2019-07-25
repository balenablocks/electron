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

interface ColorScheme {
	color: string;
	background?: string;
	subColor?: string;
	faded?: string;
	title?: string;
}

export const colors: { [name: string]: ColorScheme } = {
	primary: {
		color: '#3a3c41',
		background: '#ffffff',
		subColor: '#ababab',
		faded: '#c3c4c6',
	},
	secondary: {
		color: '#1c1d1e',
		background: '#ebeff4',
		title: '#b3b6b9',
	},
	highlight: {
		color: 'white',
		background: '#2297de',
	},
	soft: {
		color: '#4d5056',
	},
};
