# Task Explorer - View and Run Tasks from Explorer

[![Version](https://vsmarketplacebadge.apphb.com/version-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Build Status](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_apis/build/status/spmeesseman.vscode-taskexplorer?branchName=master)](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_build/latest?definitionId=10&branchName=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/spmeesseman/vscode-taskexplorer.svg)](https://greenkeeper.io/)

[![Known Vulnerabilities](https://snyk.io/test/github/spmeesseman/vscode-taskexplorer/badge.svg)](https://snyk.io/test/github/spmeesseman/vscode-taskexplorer)
[![codecov](https://codecov.io/gh/spmeesseman/vscode-taskexplorer/branch/master/graph/badge.svg)](https://codecov.io/gh/spmeesseman/vscode-taskexplorer)
[![Average time to resolve an issue](https://isitmaintained.com/badge/resolution/spmeesseman/vscode-taskexplorer.svg)](https://isitmaintained.com/project/spmeesseman/vscode-taskexplorer "Average time to resolve an issue")
[![Percentage of issues still open](https://isitmaintained.com/badge/open/spmeesseman/vscode-taskexplorer.svg)](https://isitmaintained.com/project/spmeesseman/vscode-taskexplorer "Percentage of issues still open")
[![Dependencies Status](https://david-dm.org/spmeesseman/vscode-taskexplorer/status.svg)](https://david-dm.org/spmeesseman/vscode-taskexplorer)
[![DevDependencies Status](https://david-dm.org/spmeesseman/vscode-taskexplorer/dev-status.svg)](https://david-dm.org/spmeesseman/vscode-taskexplorer?type=dev)

## Description

> Provides a single view in either (or both) the SideBar and/or Explorer that conveniently displays all VSCode tasks, NPM scripts and Ant targets (Gulp and Grunt tasks coming soon), grouped within their respective task nodes.  Tasks can be either opened or executed.  See Requirements section below.

## Requirements

* Visual Studio Code v1.30 or higher
* For npm, grunt, and gulp tasks, the 'Auto Detect' vscode setting must be turned 'On' for each respective task provider.

## Features

* v1.7 - Two view types!! - Use one or both of either SideBar View and/or Explorer Tray.
* v1.6 - Progress icons for running tasks
* v1.6 - Stop execution button for running tasks
* v1.5 - Ant task provider - Open and launch ANT targets as tasks
* v1.4 - Open and launch TSC tasks
* v1.3 - Open and launch Visual Studio Code tasks
* v1.2 - Convenient layout - groups all tasks by project folder, by task file, by task
* v1.1 - Supports multi-root or single-root workspaces
* v1.0 - Open and launch NPM scripts as tasks

## Coming Soon

* Open and launch Gulp tasks
* Open and launch Grunt tasks
* C/C++ Makefile Task Provider - Open and launch C/C++ Makefiles
* NSIS Task Provider - Open and launch NSIS installer scripts

## Known Issues

* Ansicon colorization of Ant output not working

## Screenshots

|New Sidebar view!!|Calssic Explorer Tray|Support for Ant targets|
|-|-|-|
|![ss0](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/taskview3.png?raw=true)|![ss1](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/taskview2.png?raw=true)|![ss2](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/taskview.png?raw=true)|

## Feedback & Contributing

* Please report any bugs, suggestions or documentation requests via the
  [Issues](https://github.com/spmeesseman/vscode-taskexplorer/issues)
* Feel free to submit
  [pull requests](https://github.com/spmeesseman/vscode-taskexplorer/pulls)
* [Contributors](https://github.com/spmeesseman/vscode-taskexplorer/graphs/contributors)

## Settings

|Config|Description|Default|
|-|-|-|
|`taskExplorer.enableSideBar`|Enable/show visual studio code tasks|`false`|
|`taskExplorer.enableExplorerView`|Enable a task explorer view in the sidebar|`true`|
|`taskExplorer.enableCodeTasks`|Enable a task explorer tray in the Explorer sidebar view|`true`|
|`taskExplorer.enableGulpTasks`|Enable/show ant targets as tasks|`true`|
|`taskExplorer.enableGruntTasks`|Enable/show ant targets as tasks|`true`|
|`taskExplorer.enableNpmScripts`|Enable/show npm scripts as tasks|`true`|
|`taskExplorer.enableAntTargets`|Enable/show ant targets as tasks|`true`|
|`taskExplorer.enableAnsiconForAnt`|Enable ansicon output colorization for ant tasks|`false`|",
|`taskExplorer.pathToAnt`|The path to the ant program, if not registered in system path||",
|`taskExplorer.pathToAnsicon`|The path to the ansicon binary, if not registered in system path||",
|`taskExplorer.debug`|Turn on logging|`false`|
|`taskExplorer.exclude`|Configure glob patterns for folders that should be excluded from automatic script detection|`["**/ext/**", "**/packages/**", "**/.vscode-test/**", "**/build**"]`|
