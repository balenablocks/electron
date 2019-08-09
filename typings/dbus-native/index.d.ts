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

declare module 'dbus-native' {

	import { EventEmitter } from events;

	export interface DBusInterface extends EventEmitter {
		$name: string;
		[ index: string ]: any;
	}

	export interface DBusObject {
		service: DBusService;
	}

	export interface DBusService {
		getInterface: (
			path: string,
			iface: string,
			callback: (error: Error | null, value: DBusInterface) => void
		) => void;
		getObject: (
			path: string,
			callback: (error: Error | null, value: DBusObject) => void
		) => void;
	}

	export interface DBusBus {
		getService: (name: string) => DBusService;
	}

	export function systemBus(): DBusBus;
}
