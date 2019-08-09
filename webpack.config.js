/*
 * Copyright 2019 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
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

'use strict'

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const commonConfig = {
	mode: 'production',
	node: {
		__dirname: false,
		__filename: false,
	},
	devtool: 'inline-source-map',
	module: {
		rules: [
			{
				test: /\.html$/,
				include: [ path.resolve(__dirname, 'lib') ],
				use: {
					loader: 'html-loader'
				}
			},
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: '[name].[ext]',
							outputPath: 'fonts/'
						}
					}
				]
			},
		]
	},
	output: {
		path: path.join(__dirname, 'build'),
		filename: '[name].js'
	},
	resolve: {
		extensions: [ '.js', '.ts', '.tsx' ]
	},
}

const mainConfig = {
	...commonConfig,
	...{
		target: 'electron-main',
		entry: {
			index: path.join(__dirname, 'lib', 'index.ts')
		},
	}
}

const rendererConfig = {
	...commonConfig,
	...{
		target: 'electron-renderer',
	},
}

function createRendererConfig(name) {
	return {
		...rendererConfig,
		...{
			entry: {
				[name]: path.join(__dirname, 'lib', `${name}.ts`)
			},
		}
	}
}

function createRendererConfigUI(name) {
	return {
		...rendererConfig,
		...{
			entry: {
				[name]: path.join(__dirname, 'lib', `${name}.tsx`)
			},
			plugins: [
				new HtmlWebpackPlugin({
					title: name,  // TODO
					filename: `${name}.html`,
				})
			],
		}
	}
}

module.exports = [
	createRendererConfigUI('sidebar'),
	createRendererConfigUI('wifi-config'),
	createRendererConfigUI('file-picker'),
	createRendererConfig('focus'),
	mainConfig,
]
