/*
 * Copyright 2019 resin.io
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

declare module 'x11' {
	interface ScreenSaverExtension {
		NotifyState: {
			On: number;
			Off: number;
			Cycle: number;
		};
		SelectInput: (root: number, ...mask: number[]) => void;
	}

	interface Display {
		screen: Array<{ root: number }>;
		client: {
			require: (
				name: 'screen-saver',
				callback: (error?: Error, extension: ScreenSaverExtension) => void,
			) => void;
			on(name: 'event', handler: (ev: { name: string; state: number }) => void);
		};
	}

	export function createClient(
		callback: (error?: Error, display: Display) => void,
	);
}
