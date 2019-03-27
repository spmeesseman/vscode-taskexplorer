# Explorer View - Open and Launch VSCode Tasks / NPM Scripts / Ant Targets

[![Version](https://vsmarketplacebadge.apphb.com/version-short/spmeesseman.vscode-taskview.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskview)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/spmeesseman.vscode-taskview.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskview)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating-short/spmeesseman.vscode-taskview.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskview)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Build Status](https://dev.azure.com/spmeesseman/vscode-taskview/_apis/build/status/spmeesseman.vscode-taskview?branchName=master)](https://dev.azure.com/spmeesseman/vscode-taskview/_build/latest?definitionId=6&branchName=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/spmeesseman/vscode-taskview.svg)](https://greenkeeper.io/)

[![Known Vulnerabilities](https://snyk.io/test/github/spmeesseman/vscode-taskview/badge.svg)](https://snyk.io/test/github/spmeesseman/vscode-taskview)
[![codecov](https://codecov.io/gh/spmeesseman/vscode-taskview/branch/master/graph/badge.svg)](https://codecov.io/gh/spmeesseman/vscode-taskview)
[![Average time to resolve an issue](https://isitmaintained.com/badge/resolution/spmeesseman/vscode-taskview.svg)](https://isitmaintained.com/project/spmeesseman/vscode-taskview "Average time to resolve an issue")
[![Percentage of issues still open](https://isitmaintained.com/badge/open/spmeesseman/vscode-taskview.svg)](https://isitmaintained.com/project/spmeesseman/vscode-taskview "Percentage of issues still open")
[![Dependencies Status](https://david-dm.org/spmeesseman/vscode-taskview/status.svg)](https://david-dm.org/spmeesseman/vscode-taskview)
[![DevDependencies Status](https://david-dm.org/spmeesseman/vscode-taskview/dev-status.svg)](https://david-dm.org/spmeesseman/vscode-taskview?type=dev)

## Description

> Provides a view in the Explorer that conveniently displays VSCode tasks, NPM scripts, and Ant targets, grouped within their respective task nodes.  Tasks can be either opened or executed.  See Important Notes section below.

## Important Notes

> For now, you must disable auto detection of npm scripts in the Npm settings, otherwise npm scripts will be displayed twice within each package.json node.  This will be corrected in a future release.

## Features

Open and launch tasks from one single view in Explorer:

* Open and launch Visual Studio Code tasks
* Open and launch NPM scripts as tasks
* Open and launch Ant targets as tasks (beta)

## Screenshots

![extension ss1](https://github.com/spmeesseman/vscode-taskview/blob/master/res/taskview.png?raw=true)

## Feedback & Contributing

* Please report any bugs, suggestions or documentation requests via the
  [Issues](https://github.com/spmeesseman/vscode-taskview/issues)
* Feel free to submit
  [pull requests](https://github.com/spmeesseman/vscode-taskview/pulls)
* [Contributors](https://github.com/spmeesseman/vscode-taskview/graphs/contributors)

## Settings

|Config|Description|Default|
|-|-|-|
|`taskView.enableCodeTasks`|Enable/show visual studio code tasks|`true`|
|`taskView.enableNpmScripts`|Enable/show npm scripts as tasks|`true`|
|`taskView.enableAntTargets`|Enable/show ant targets as tasks|`true`|
|`taskView.autoDetect`|Controls whether npm scripts and ant tasks should be automatically detected|`true`|
|`taskView.debug`|Turn on logging|`false`|
|`taskView.runSilent`|Run commands with the `--silent` option|`false`|
|`taskView.packageManager`|The package manager used to run npm scripts|`npm`|
|`taskView.exclude`|Configure glob patterns for folders that should be excluded from automatic script detection|`["**/ext/**", "**/packages/**", "**/.vscode-test/**""**/build**"]`|
|`taskView.fetchOnlinePackageInfo`|Fetch data from https://registry.npmjs.org and https://registry.bower.io to provide auto-completion and information on hover features on npm dependencies|`true`|
