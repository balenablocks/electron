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

import { promises as fs } from 'fs';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as MiniCssExtractPlugin from 'mini-css-extract-plugin';
import * as path from 'path';
import { env } from 'process';
import * as tsj from 'ts-json-schema-generator';
import { Compiler, Configuration } from 'webpack';

const MODE = env.NODE_ENV === 'development' ? 'development' : 'production';

const commonConfig: Configuration = {
	mode: MODE,
	optimization: {
		usedExports: true,
	},
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
						},
					},
				],
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	output: {
		path: path.join(__dirname, 'build'),
		filename: '[name].js',
	},
	resolve: {
		extensions: ['.js', '.ts', '.tsx'],
	},
};

if (MODE === 'development') {
	commonConfig.devtool = 'inline-source-map';
}

const mainConfig = {
	...commonConfig,
	...{
		target: 'electron-main',
		entry: {
			index: path.join(__dirname, 'src', 'index.ts'),
		},
		plugins: [
			{
				apply: (compiler: Compiler) => {
					compiler.hooks.afterEmit.tap('AfterEmitPlugin', async () => {
						const schema = tsj
							.createGenerator({
								path: path.join('src', 'settings', 'schema.ts'),
								skipTypeCheck: true,
							})
							.createSchema();
						await fs.writeFile(
							path.join('build', 'settings-schema.json'),
							JSON.stringify(schema, null, 4),
						);
					});
				},
			},
		],
	},
};

const rendererConfig = {
	...commonConfig,
	...{
		target: 'electron-renderer',
	},
};

function createRendererConfig(...name: string[]) {
	return {
		...rendererConfig,
		...{
			entry: {
				[path.join(...name)]: path.join(__dirname, 'src', ...name) + '.ts',
			},
		},
	};
}

function createRendererConfigUI(...name: string[]) {
	return {
		...rendererConfig,
		...{
			entry: {
				[path.join(...name)]:
					path.join(__dirname, 'src', 'ui', ...name) + '.tsx',
			},
			plugins: [
				new HtmlWebpackPlugin({
					title: path.join(...name), // TODO
					filename: `${path.join('ui', ...name)}.html`,
				}),
				new MiniCssExtractPlugin({ filename: path.join('ui', '[name].css') }),
			],
		},
	};
}

module.exports = [
	createRendererConfigUI('wifi-config'),
	createRendererConfigUI('open-window-overlay-icon'),
	createRendererConfigUI('sleep-overlay-icon'),
	createRendererConfigUI('settings'),
	createRendererConfigUI('mounts'),
	createRendererConfigUI('file-selector-window'),
	createRendererConfig('on-screen-keyboard', 'focus'),
	mainConfig,
];
