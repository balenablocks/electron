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

const { promises: fs } = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const { env } = require('process');
const tsj = require('ts-json-schema-generator');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const MODE = env.NODE_ENV === 'development' ? 'development' : 'production';

const commonConfig = {
	mode: MODE,
	node: {
		__dirname: false,
		__filename: false,
	},
	module: {
		rules: [
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
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
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

if (MODE === 'development') {
	commonConfig.devtool = 'inline-source-map';
}

const mainConfig = {
	...commonConfig,
	...{
		target: 'electron-main',
		entry: {
			index: path.join(__dirname, 'src', 'index.ts')
		},
		plugins: [
			{
				apply: (compiler) => {
					compiler.hooks.afterEmit.tap('AfterEmitPlugin', async (compilation) => {
						const schema = tsj.createGenerator({
							path: 'src/settings/schema.ts',
							skipTypeCheck: true,
						}).createSchema('Settings');
						await fs.writeFile('build/settings-schema.json', JSON.stringify(schema, null, 4));
					});
				}
			},
		]
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
				}),
				new MiniCssExtractPlugin({ filename: 'ui/[name].css' }),
			],
		}
	}
}

module.exports = [
	createRendererConfigUI('sidebar'),
	createRendererConfigUI('wifi-config'),
	createRendererConfigUI('open-window-overlay-icon'),
	createRendererConfigUI('sleep-overlay-icon'),
	createRendererConfigUI('settings'),
	createRendererConfigUI('mounts'),
	createRendererConfigUI('file-selector-window'),
	createRendererConfig('on-screen-keyboard', 'focus'),
	mainConfig,
]
