# Task Explorer - View and Run Tasks from Visual Studio Code

[![Version](https://vsmarketplacebadge.apphb.com/version-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![authors](https://img.shields.io/badge/authors-scott%20meesseman-6F02B5.svg?logo=visual%20studio%20code)](https://www.littlesm.com)

[![Build Status](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_apis/build/status/spmeesseman.vscode-taskexplorer?branchName=master)](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_build/latest?definitionId=10&branchName=master)
[![codecov](https://codecov.io/gh/spmeesseman/vscode-taskexplorer/branch/master/graph/badge.svg)](https://codecov.io/gh/spmeesseman/vscode-taskexplorer)
[![Greenkeeper badge](https://badges.greenkeeper.io/spmeesseman/vscode-taskexplorer.svg)](https://greenkeeper.io/)
[![GitHub issues open](https://img.shields.io/github/issues-raw/spmeesseman/vscode%2dtaskexplorer.svg?maxAge=2592000&logo=github)](https://github.com/spmeesseman/vscode-taskexplorer/issues)
[![GitHub issues closed](https://img.shields.io/github/issues-closed-raw/spmeesseman/vscode%2dtaskexplorer.svg?maxAge=2592000&logo=github)](https://github.com/spmeesseman/vscode-taskexplorer/issues)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

![src0](res/sources/npm.png?raw=true) ![src1](res/sources/ant.png?raw=true) ![src2](res/sources/grunt.png?raw=true) ![src3](res/sources/gulp.png?raw=true) ![src13](res/sources/gradle.png?raw=true) ![src4](res/sources/workspace.png?raw=true) ![src5](res/sources/make.png?raw=true) ![src6](res/sources/ts.png?raw=true) ![src7](res/sources/bat.png?raw=true) ![src8](res/sources/ruby.png?raw=true) ![src9](res/sources/powershell.png?raw=true) ![src10](res/sources/bash.png?raw=true) ![src11](res/sources/python.png?raw=true) ![src12](res/sources/nsis.png?raw=true)

## Description

> Provides a view in either (or both) the SideBar and/or Explorer that displays all supported tasks organized into a treeview, with parent task file nodes, grouped nodes, and project folders (convenient for large multi-root workspaces).  Tasks can be opened for view/edit, executed, and stopped.  NPM file nodes support special npm command(s) (i.e. 'install') via context menu.

## Table of Contents

- [Task Explorer - View and Run Tasks from Visual Studio Code](#task-explorer---view-and-run-tasks-from-visual-studio-code)
  - [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Screenshots](#screenshots)
  - [Requirements](#requirements)
  - [Features](#features)
  - [Configuring Global Excludes and Apache Ant Includes with Glob Patterns](#configuring-global-excludes-and-apache-ant-includes-with-glob-patterns)
  - [Internally Provided Tasks vs. VSCode Provided Tasks](#internally-provided-tasks-vs-vscode-provided-tasks)
  - [Running bash/sh scripts in Windows Environment](#running-bashsh-scripts-in-windows-environment)
  - [Feedback & Contributing](#feedback--contributing)
  - [Thank You](#thank-you)
  - [Other Code Extensions by spmeesseman](#other-code-extensions-by-spmeesseman)

## Screenshots

|Original Explorer Tray|Sidebar View (v1.7)|Task Type Groups (v1.13)|
|-|-|-|
|![ss0](res/taskview1.png?raw=true)|![ss1](res/taskview2.png?raw=true)|![ss2](res/taskview3.png?raw=true)|

|Grunt/Gulp in Subfolders (v1.14)|Npm Commands (v1.16)||
|-|-|-|
|![ss3](res/taskview4.png?raw=true)|![ss3](res/taskview5.png?raw=true)||

## Requirements

* Visual Studio Code v1.30+

## Features

* v1.22 - Major performance enhancements - Task Tree / Task Scanning
* v1.21 - Add option to keep terminal open after stopping task [closes #51]
* v1.20 - Add support for restarting task (thank you **antfu**)
* v1.19 - App-Publisher task support for BETA testing
* v1.18 - Added 'Add to excludes' action in task file node context menu
* v1.17 - Added 'Run last task' button to titlebar
* v1.16 - Added npm management tasks to npm file node context menus
* v1.15 - Support for gradle tasks (includes provider) (closes [#15](https://github.com/spmeesseman/vscode-taskexplorer/issues/15))
* v1.14 - Support for grunt and gulp task files not located in the project root (closes [#12](https://github.com/spmeesseman/vscode-taskexplorer/issues/15))
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

The setting *exclude* defines a string or an array of strings of file patterns to ignore.  The setting applies to all script types.  The string(s) must be glob pattern(s), for example:

* `taskExplorer.exclude: [ "**/.vscode-test/**", "**/vendor/**", "**/out/**", "**/output/**" ]`

Note that the glob pattern "\*\*/node_modules/\*\*" is applied by default to the excludes list in all cases.  Using the *exclude* configuration can greatly improve performance in large workspaces if configured correctly.

**Apache Ant** uses an .xml file extension, the setting *includeAnt* can be used to specify other file names other than [Bb]uild.xml to include as ant files so that all xml files do not need to be searched (slowing down tree refreshes in large workspaces or project with a large number of various xml files).  The setting is a string or an array of strings and must be glob pattern(s) including the .xml extension, for example:

* `taskExplorer.includeAnt: [ "**/extraTasks.xml", "**/scripts/ant/*.xml" ]`

Note that the glob pattern "\*\*/[Bb]uild.xml" is applied by default to the **Ant** includes list in all cases.

## Internally Provided Tasks vs. VSCode Provided Tasks

The following tasks are provided by VSCode:

* Workspace (.vscode/tasks.json)
* NPM (**/package.json)

All other tasks are internaly provided.  Workspace tasks are detected by VSCode in all cases.  However, NPM tasks are detected only if the setting `'Npm -> Auto Detect'` is turned on in VSCode Settings.  By default this is turned on, but if NPM tasks are not displaying, please check this setting, also check the setting that turns npm package management off in favor of Yarn `'Npm -> Package manager'`.  A future release will contain internally provided NPM and Yarn tasks.  Note these tasks are still displayed in the Task Tree, just not "provided" by this extension.

Detection of all internally provided task types can be turned on/off in Settings - `'Task Explorer -> Enable [Tasktype]'`.

## Running bash/sh scripts in Windows Environment

Bash/sh scripts in Windows will have the shell executable automatically set to a bash shell (if the default shell set in VSCode is not bash).  The shell executable used can be set in Settings using the `pathToBash` setting.  If there is no value set in Settings, and Git Bash exists at the default installation installation, Git Bash will be used (MinGW).  If Git Bash does not exist at the default install location, it is assumed the the path to bash.exe is part of the system PATH variable.  If you experience errors running Bash scripts in Windows, please check these items.

## Feedback & Contributing

* Please report any bugs, suggestions or documentation requests via the
  [Issues](https://github.com/spmeesseman/vscode-taskexplorer/issues)
* Feel free to submit
  [Pull Requests](https://github.com/spmeesseman/vscode-taskexplorer/pulls)
* [Contributors](https://github.com/spmeesseman/vscode-taskexplorer/graphs/contributors)

## Thank You

* The [Material Icon Theme](https://marketplace.visualstudio.com/itemdetails?itemName=PKief.material-icon-theme) for some of the task type icons.
* The author of the [NSIS Extension](https://marketplace.visualstudio.com/items?itemName=idleberg.nsis) idleberg for NSIS graphics.

## Other Code Extensions by spmeesseman

|Package|Repository|Marketplace|
|-|-|-|
|svn-scm-ext|[GitHub](https://github.com/spmeesseman/svn-scm-ext)|[Visual Studio Marketplace](https://marketplace.visualstudio.com/itemdetails?itemName=spmeesseman.svn-scm-ext)|
|vscode-vslauncher|[GitHub](https://github.com/spmeesseman/vscode-vslauncher)|[Visual Studio Marketplace](https://marketplace.visualstudio.com/itemdetails?itemName=spmeesseman.vscode-vslauncher)|
