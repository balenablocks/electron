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
							outputPath: path.join('ui', 'fonts'),
							publicPath: 'fonts',
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
			index: path.join(__dirname, 'src', 'index.ts')
		},
	}
}

const rendererConfig = {
	...commonConfig,
	...{
		target: 'electron-renderer',
	},
}

function createRendererConfig(...name) {
	return {
		...rendererConfig,
		...{
			entry: {
				[path.join(...name)]: path.join(__dirname, 'src', ...name) + '.ts',
			},
		}
	}
}

function createRendererConfigUI(...name) {
	return {
		...rendererConfig,
		...{
			entry: {
				[path.join(...name)]: path.join(__dirname, 'src', 'ui', ...name) + '.tsx',
			},
			plugins: [
				new HtmlWebpackPlugin({
					title: path.join(...name),  // TODO
					filename: `${path.join('ui', ...name)}.html`,
				})
			],
		}
	}
}

module.exports = [
	createRendererConfigUI('sidebar'),
	createRendererConfigUI('wifi-config'),
	createRendererConfigUI('file-selector-window'),
	createRendererConfig('on-screen-keyboard', 'focus'),
	mainConfig,
]
