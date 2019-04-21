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

![src0](res/sources/npm.png?raw=true) ![src1](res/sources/ant.png?raw=true) ![src2](res/sources/grunt.png?raw=true) ![src3](res/sources/gulp.png?raw=true) ![src13](res/sources/gradle.png?raw=true) ![src4](res/sources/workspace.png?raw=true) ![src5](res/sources/make.png?raw=true) ![src6](res/sources/ts.png?raw=true) ![src7](res/sources/bat.png?raw=true) ![src8](res/sources/ruby.png?raw=true) ![src9](res/sources/powershell.png?raw=true) ![src10](res/sources/bash.png?raw=true) ![src11](res/sources/python.png?raw=true) ![src12](res/sources/nsis.png?raw=true)

## Description

> Provides a view in either (or both) the SideBar and/or Explorer that displays all supported tasks organized into a treeview, with parent task file nodes, grouped nodes, and project folders (convenient for large multi-root workspaces).  Tasks can be opened for view/edit, executed, and stopped.  NPM file nodes support special npm command(s) (i.e. 'install') via context menu.

## Screenshots

|Original Explorer Tray|Sidebar View (v1.7)|Task Type Groups (v1.13)|
|-|-|-|
|![ss0](res/taskview1.png?raw=true)|![ss1](res/taskview2.png?raw=true)|![ss2](res/taskview3.png?raw=true)|

|Grunt/Gulp in Subfolders (v1.14)|||
|-|-|-|
|![ss3](res/taskview4.png?raw=true)|||

## Requirements

* Visual Studio Code v1.30 or higher
* To display npm, grunt, and gulp tasks, the 'Auto Detect' setting must be turned 'On' in VSCode for each respective task provider.

## Features

* Check out the [todo list](https://github.com/spmeesseman/vscode-taskexplorer/blob/master/.todo) (made with [Todo+](https://marketplace.visualstudio.com/itemdetails?itemName=fabiospampinato.vscode-todo-plus))
* v1.15 - Support for gradle tasks (includes provider)
* v1.14 - Support for grunt and gulp task files not located in the project root
* v1.13 - Multiple task files of the same type placed within a group node for less clutter in folder level nodes
* v1.12 - Support for bash, batch, perl, powershell, python, ruby, and nsis scripts (includes provider)
* v1.11 - N/A - Obsolete Batch Task Provider replaced by v1.12 ScriptProvider
* v1.10 - Support for Makefiles (includes provider)
* v1.9 - Support for gulp and grunt tasks (includes provider)
* v1.8 - Support for ant files not named [Bb]uild.xml, ansicon output colorization fixed
* v1.7 - Two view types - Use one or both of either SideBar View and/or Explorer Tray
* v1.6 - Progress icons for running tasks
* v1.6 - Stop execution button for running tasks
* v1.5 - Support for Apache Ant tasks (includes provider)
* v1.4 - Support for TSC tasks
* v1.3 - Support for Visual Studio Code tasks
* v1.2 - Convenient layout - groups all tasks by project folder, by task file, by task
* v1.1 - Supports multi-root or single-root workspaces
* v1.0 - Open and launch NPM scripts as tasks

## Configuring Global Excludes and Apache Ant Includes with Glob Patterns

The setting 'exclude' defines a string or an array of strings of file patterns to ignore.  The setting applies to all script types.  The string(s) must be glob pattern(s), for example:

`taskExplorer.exclude: [ "**/.vscode-test/**", "**/vendor/**", "**/out/**", "**/output/**" ]`

Note that the glob pattern "\*\*/node_modules/\*\*" is applied by default to the excludes list in all cases.

Since Apache Ant uses a .xml file extension, the setting 'includeAnt' can be used to specify other file names other than [Bb]uild.xml to include as ant files so that all xml files do not need to be searched (slowing down tree refreshes in large workspaces or project with a large number of various xml files).  The setting is a string or an array of strings and must be glob pattern(s) including the .xml extension, for example:

`taskExplorer.includeAnt: [ "**/extraTasks.xml", "**/scripts/ant/*.xml" ]`

Note that the glob pattern "\*\*/[Bb]uild.xml" is applied by default to the ant includes list in all cases.

## Internally Provided Tasks vs. VSCode Provided Tasks

The following tasks are provided by VSCode:

* Workspace (.vscode/tasks.json)
* NPM (**/package.json)

All other tasks are internaly provided.  Workspace tasks are detected by VSCode in all cases.  However, NPM tasks are detected only if the setting `'Npm -> Auto Detect'` is turned on in VSCode Settings.  By default this is turned on.  If NPM tasks are not displaying, please check this setting.

Detection of all internally provided task types can be turned on/off in Settings - `'Task Explorer -> Enable [Tasktype]'`.

## Feedback & Contributing

* Please report any bugs, suggestions or documentation requests via the
  [Issues](https://github.com/spmeesseman/vscode-taskexplorer/issues)
* Feel free to submit
  [pull requests](https://github.com/spmeesseman/vscode-taskexplorer/pulls)
* [Contributors](https://github.com/spmeesseman/vscode-taskexplorer/graphs/contributors)

## Credits

* The [Material Icon Theme](https://marketplace.visualstudio.com/itemdetails?itemName=PKief.material-icon-theme) for some of the task type icons.

## Builds by spmeesseman

|Package|Use Case|Repository|Marketplace|
|-|-|-|-|
|conventional-changelog-spm|Semantic-Release|[GitHub](https://github.com/spmeesseman/conventional-changelog-spm)|[Npmjs.org Registry](https://www.npmjs.com/package/conventional-changelog-spm)|
|extjs-pkg-plyr|ExtJS Open Tooling|[GitHub](https://github.com/spmeesseman/extjs-pkg-plyr)|[Npmjs.org Registry](https://www.npmjs.com/package/extjs-pkg-plyr)|
|extjs-pkg-tinymce|ExtJS Open Tooling|[GitHub](https://github.com/spmeesseman/extjs-pkg-tinymce)|[Npmjs.org Registry](https://www.npmjs.com/package/extjs-pkg-tinymce)|
|extjs-pkg-websocket|ExtJS Open Tooling|[GitHub](https://github.com/spmeesseman/extjs-pkg-websocket)|[Npmjs.org Registry](https://www.npmjs.com/package/extjs-pkg-websocket)|
|extjs-pkg-webworker|ExtJS Open Tooling|[GitHub](https://github.com/spmeesseman/extjs-pkg-webworker)|[Npmjs.org Registry](https://www.npmjs.com/package/extjs-pkg-webworker)|
|extjs-server-net|ExtJS Open Tooling|[GitHub](https://github.com/spmeesseman/extjs-server-net)|[Npmjs.org Registry](https://www.npmjs.com/package/extjs-server-net)|
|extjs-theme-graphite-small|ExtJS Open Tooling|[GitHub](https://github.com/spmeesseman/extjs-theme-graphite-small)|[Npmjs.org Registry](https://www.npmjs.com/package/extjs-theme-graphite-small)|
|extjs-theme-amethyst|ExtJS Open Tooling|[GitHub](https://github.com/spmeesseman/extjs-theme-amethyst)|[Npmjs.org Registry](https://www.npmjs.com/package/extjs-theme-amethyst)|
|svn-scm-ext|Visual Studio Code|[GitHub](https://github.com/spmeesseman/svn-scm-ext)|[Visual Studio Marketplace](https://marketplace.visualstudio.com/itemdetails?itemName=spmeesseman.svn-scm-ext)|
|vscode-taskexplorer|Visual Studio Code|[GitHub](https://github.com/spmeesseman/vscode-taskexplorer)|[Visual Studio Marketplace](https://marketplace.visualstudio.com/itemdetails?itemName=spmeesseman.vscode-taskexplorer)|
|vscode-vslauncher|Visual Studio Code|[GitHub](https://github.com/spmeesseman/vscode-vslauncher)|[Visual Studio Marketplace](https://marketplace.visualstudio.com/itemdetails?itemName=spmeesseman.vscode-vslauncher)|

## Settings

|Config|Description|Default|
|-|-|-|
|`taskExplorer.enableSideBar`|Enable/show visual studio code tasks|`false`|
|`taskExplorer.enableExplorerView`|Enable a task explorer view in the sidebar|`true`|
|`taskExplorer.enableAnt`|Enable/show ant targets as tasks|`true`|
|`taskExplorer.enableBash`|Enable/show bash scripts as tasks|`true`|
|`taskExplorer.enableBatch`|Enable/show batch file scripts as tasks|`true`|
|`taskExplorer.enableGradle`|Enable/show gradle tasks|`true`|
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
|`taskExplorer.pathToGradle`|The path to the gradle program, if not registered in system path|`gradle.bat` for Windows, `gradle` for Unix|",
|`taskExplorer.pathToMake`|The path to the make program, if not registered in system path|`nmake` for Windows, `make` for Unix|",
|`taskExplorer.pathToNsis`|The path to the nsis make program, if not registered in system path|`makensis.exe`|",
|`taskExplorer.pathToPerl`|The path to the perl program, if not registered in system path|`perl`|",
|`taskExplorer.pathToPython`|The path to the python program, if not registered in system path|`python`|",
|`taskExplorer.pathToRuby`|The path to the ruby program, if not registered in system path|`ruby`|",
|`taskExplorer.debug`|Turn on logging|`false`|
|`taskExplorer.exclude`|Configure glob patterns for folders that should be excluded from automatic script detection|`["**/.vscode-test/**", "**/bin/**", "**/build/**", "**/CompiledOutput/**", "**/dist/**", "**/doc/**", "**/ext/**", "**/out/**", "**/output/**", "**/packages/**", "**/release/**", "**/releases/**", "**/samples/**", "**/sdks/**", "**/static/**", "**/target/**", "**/test/**", "**/third_party/**", "**/vendor/**"]`  By default, `"**/node_modules/**"` is always applied|
|`taskExplorer.includeAnt`|Configure glob patterns for files that should be included in ANT script detection|`[]`  By default, `"**/[Bb]uild.xml"` is always applied|
