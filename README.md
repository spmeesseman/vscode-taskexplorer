# Task Explorer - View and Run Tasks from Visual Studio Code

[![Version](https://vsmarketplacebadge.apphb.com/version-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Build Status](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_apis/build/status/spmeesseman.vscode-taskexplorer?branchName=master)](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_build/latest?definitionId=10&branchName=master)
[![codecov](https://codecov.io/gh/spmeesseman/vscode-taskexplorer/branch/master/graph/badge.svg)](https://codecov.io/gh/spmeesseman/vscode-taskexplorer)

[![Greenkeeper badge](https://badges.greenkeeper.io/spmeesseman/vscode-taskexplorer.svg)](https://greenkeeper.io/)
[![Dependencies Status](https://david-dm.org/spmeesseman/vscode-taskexplorer/status.svg)](https://david-dm.org/spmeesseman/vscode-taskexplorer)
[![DevDependencies Status](https://david-dm.org/spmeesseman/vscode-taskexplorer/dev-status.svg)](https://david-dm.org/spmeesseman/vscode-taskexplorer?type=dev)
[![Known Vulnerabilities](https://snyk.io/test/github/spmeesseman/vscode-taskexplorer/badge.svg)](https://snyk.io/test/github/spmeesseman/vscode-taskexplorer)
[![Average time to resolve an issue](https://isitmaintained.com/badge/resolution/spmeesseman/vscode-taskexplorer.svg)](https://isitmaintained.com/project/spmeesseman/vscode-taskexplorer "Average time to resolve an issue")
[![Percentage of issues still open](https://isitmaintained.com/badge/open/spmeesseman/vscode-taskexplorer.svg)](https://isitmaintained.com/project/spmeesseman/vscode-taskexplorer "Percentage of issues still open")

![src0](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/npm.png?raw=true) ![src1](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/ant.png?raw=true) ![src2](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/grunt.png?raw=true) ![src3](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/gulp.png?raw=true) ![src4](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/workspace.png?raw=true) ![src5](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/make.png?raw=true) ![src6](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/ts.png?raw=true) ![src7](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/bat.png?raw=true) ![src8](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/ruby.png?raw=true) ![src9](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/powershell.png?raw=true) ![src10](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/bash.png?raw=true) ![src11](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/python.png?raw=true) ![src12](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/sources/nsis.png?raw=true)

## Description

> Provides an organized view in either (or both) the SideBar and/or Explorer that conveniently displays all supported tasks, organized into a treeview, with parent task file nodes and project folders (perfect for large multi-root workspaces).  Tasks can be opened for view/edit, executed, and stopped.  'npm install' is supported in the context menu of all npm file nodes.

## Screenshots

|Original Explorer Tray|Sidebar View (v1.7)|Task Type Groups (v1.13)|
|-|-|-|
|![ss0](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/taskview2.png?raw=true)|![ss1](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/taskview3.png?raw=true)|![ss2](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/res/taskview1.png?raw=true)|

## Requirements

* Visual Studio Code v1.30 or higher
* To display npm, grunt, and gulp tasks, the 'Auto Detect' setting must be turned 'On' in VSCode for each respective task provider.
* Some task types inherit the associated file type icon from VSCode when displayed in the task tree.  You must have an icon set installed and active (for example, the [Material Icon Theme](https://marketplace.visualstudio.com/itemdetails?itemName=PKief.material-icon-theme)) for these task types to display icons in the tree nodes.

## Features

* Check out the [todo list](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/.todo)
* v1.13 - Multiple task files of the same type are now placed within a group node for less clutter in folder level nodes
* v1.12 - Script Task Provider - Open and launch bash, batch, perl, powershell, python, ruby, and nsis scripts
* v1.11 - N/A - Obsolete Batch Task Provider replaced by v1.12 ScriptProvider
* v1.10 - Makefile Task Provider - Open and launch C/C++ Makefile targets
* v1.9 - Support for gulp and grunt tasks
* v1.8 - Support for ant files not named [Bb]uild.xml, ansicon output colorization fixed
* v1.7 - Two view types!! - Use one or both of either SideBar View and/or Explorer Tray
* v1.6 - Progress icons for running tasks
* v1.6 - Stop execution button for running tasks
* v1.5 - Ant task provider - Open and launch ANT targets as tasks
* v1.4 - Open and launch TSC tasks
* v1.3 - Open and launch Visual Studio Code tasks
* v1.2 - Convenient layout - groups all tasks by project folder, by task file, by task
* v1.1 - Supports multi-root or single-root workspaces
* v1.0 - Open and launch NPM scripts as tasks

## Configuring excludes and ant includes with glob patterns

The setting 'exclude' defines a string or an array of strings of file patterns to ignore.  The setting applies to all script types.  The string(s) must be glob pattern(s), for example:

    taskExplorer.exclude: [ "**/.vscode-test/**", "**/vendor/**", "**/out/**", "**/output/**" ]

> Note that the glob pattern "\*\*/node_modules/\*\*" is applied by default to the excludes list in all cases.

The setting 'includeAnt' is a string or an array of strings used to define file patterns to include which would have normally been ignored by the internal Ant Task Provider.  By default, only ant files named [Bb]uild.xml are considered.  The string(s) must be glob pattern(s) and should include the .xml extension, for example:

    taskExplorer.includeAnt: [ "**/extraTasks.xml", "**/scripts/ant/*.xml" ]

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
|`taskExplorer.enableAnt`|Enable/show ant targets as tasks|`true`|
|`taskExplorer.enableBash`|Enable/show bash scripts as tasks|`true`|
|`taskExplorer.enableBatch`|Enable/show batch file scripts as tasks|`true`|
|`taskExplorer.enableGrunt`|Enable/show grunt tasks|`true`|
|`taskExplorer.enableGulp`|Enable/show gulp tasks|`true`|
|`taskExplorer.enableNpm`|Enable/show npm scripts as tasks|`true`|
|`taskExplorer.enableNsis`|Enable/show nullsoft installer scripts as tasks|`true`|
|`taskExplorer.enablePowershell`|Enable/show powershell scripts as tasks|`true`|
|`taskExplorer.enablePython`|Enable/show python scripts as tasks|`true`|
|`taskExplorer.enableRuby`|Enable/show ruby scripts as tasks|`true`|
|`taskExplorer.enableTsc`|Enable/show tsc npm configs as tasks|`true`|
|`taskExplorer.enableWorkspace`|Enable/show vscode tasks|`true`|
|`taskExplorer.enableMake`|Enable/show Makefile targets as tasks|`true`|
|`taskExplorer.enableAnsiconForAnt`|Enable ansicon output colorization for ant tasks|`false`|",
|`taskExplorer.pathToAnt`|The path to the ant program, if not registered in system path|`ant.bat` for Windows, `ant` for Unix|",
|`taskExplorer.pathToAnsicon`|The path to the ansicon binary, if not registered in system path|`ansicon.exe`|",
|`taskExplorer.pathToMake`|The path to the make program, if not registered in system path|`nmake` for Windows, `make` for Unix|",
|`taskExplorer.pathToNsis`|The path to the nsis make program, if not registered in system path|`makensis.exe`|",
|`taskExplorer.pathToPerl`|The path to the perl program, if not registered in system path|`perl`|",
|`taskExplorer.pathToPython`|The path to the python program, if not registered in system path|`python`|",
|`taskExplorer.pathToRuby`|The path to the ruby program, if not registered in system path|`ruby`|",
|`taskExplorer.debug`|Turn on logging|`false`|
|`taskExplorer.exclude`|Configure glob patterns for folders that should be excluded from automatic script detection|`["**/.vscode-test/**", "**/bin/**", "**/build/**", "**/CompiledOutput/**", "**/dist/**", "**/doc/**", "**/ext/**", "**/out/**", "**/output/**", "**/packages/**", "**/release/**", "**/releases/**", "**/samples/**", "**/sdks/**", "**/static/**", "**/target/**", "**/test/**", "**/third_party/**", "**/vendor/**"]`  By default, `"**/node_modules/**"` is always applied|
|`taskExplorer.includeAnt`|Configure glob patterns for files that should be included in ANT script detection|`[]`  By default, `"**/[Bb]uild.xml"` is always applied|
