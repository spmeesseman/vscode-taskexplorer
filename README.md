# Task Explorer - View and Run Tasks from Visual Studio Code

[![Version](https://vsmarketplacebadge.apphb.com/version-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating-short/spmeesseman.vscode-taskexplorer.svg)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer&ssr=false#review-details)
[![authors](https://img.shields.io/badge/authors-scott%20meesseman-6F02B5.svg?logo=visual%20studio%20code)](https://www.littlesm.com)
[![PayPalDonate](https://img.shields.io/badge/paypal-donate-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=YWZXT3KE2L4BA&item_name=taskexplorer&currency_code=USD)

[![Greenkeeper badge](https://badges.greenkeeper.io/spmeesseman/vscode-taskexplorer.svg)](https://greenkeeper.io/)
[![Build Status](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_apis/build/status/spmeesseman.vscode-taskexplorer?branchName=master)](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_build/latest?definitionId=10&branchName=master)
[![azuretests](https://img.shields.io/azure-devops/tests/spmeesseman/vscode-taskexplorer/10?compact_message)](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_build/latest?definitionId=10&branchName=master)
[![azurecoverage](https://img.shields.io/azure-devops/coverage/spmeesseman/vscode-taskexplorer/10)](https://dev.azure.com/spmeesseman/vscode-taskexplorer/_build/latest?definitionId=10&branchName=master)
[![codecov](https://codecov.io/gh/spmeesseman/vscode-taskexplorer/branch/master/graph/badge.svg)](https://codecov.io/gh/spmeesseman/vscode-taskexplorer)
[![CodeFactor](https://www.codefactor.io/repository/github/spmeesseman/vscode-taskexplorer/badge)](https://www.codefactor.io/repository/github/spmeesseman/vscode-taskexplorer)

[![GitHub issues open](https://img.shields.io/github/issues-raw/spmeesseman/vscode%2dtaskexplorer.svg?logo=github)](https://github.com/spmeesseman/vscode-taskexplorer/issues)
[![GitHub issues closed](https://img.shields.io/github/issues-closed-raw/spmeesseman/vscode%2dtaskexplorer.svg?logo=github)](https://github.com/spmeesseman/vscode-taskexplorer/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/spmeesseman/vscode%2dtaskexplorer.svg?logo=github)](https://github.com/spmeesseman/vscode-taskexplorer/pulls)
[![GitHub last commit](https://img.shields.io/github/last-commit/spmeesseman/vscode%2dtaskexplorer.svg?logo=github)](https://github.com/spmeesseman/vscode-taskexplorer)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

![src0](res/sources/npm.png?raw=true) ![src1](res/sources/ant.png?raw=true) ![src2](res/sources/grunt.png?raw=true) ![src3](res/sources/gulp.png?raw=true) ![src13](res/sources/gradle.png?raw=true) ![src4](res/sources/workspace.png?raw=true) ![src5](res/sources/make.png?raw=true) ![src6](res/sources/ts.png?raw=true) ![src7](res/sources/bat.png?raw=true) ![src8](res/sources/ruby.png?raw=true) ![src9](res/sources/powershell.png?raw=true) ![src10](res/sources/bash.png?raw=true) ![src11](res/sources/python.png?raw=true) ![src12](res/sources/nsis.png?raw=true)

## Description

Provides a view in either (or both) the SideBar and/or Explorer that displays all supported tasks organized into a treeview, with parent task file nodes, grouped nodes, and project folders (convenient for large multi-root workspaces).  Tasks can be opened for view/edit, executed, and stopped, among other things for specific task types, for example NPM file nodes support common npm command(s) (i.e. 'install') via context menu.

## Table of Contents

- [Task Explorer - View and Run Tasks from Visual Studio Code](#task-explorer---view-and-run-tasks-from-visual-studio-code)
  - [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Screenshots by Version](#screenshots-by-version)
  - [Requirements](#requirements)
  - [Features by Version](#features-by-version)
  - [Configuring Global Excludes and Apache Ant Includes](#configuring-global-excludes-and-apache-ant-includes)
  - [Ant and Gulp Self Provided Tasks](#ant-and-gulp-self-provided-tasks)
  - [Using Groups With A Separator](#using-groups-with-a-separator)
  - [Internally Provided Tasks vs. VSCode Provided Tasks](#internally-provided-tasks-vs-vscode-provided-tasks)
  - [Running bash/sh scripts in Windows Environment](#running-bashsh-scripts-in-windows-environment)
  - [Feedback & Contributing](#feedback--contributing)
    - [Rate It - Leave Some Stars](#rate-it---leave-some-stars)
  - [Thank You](#thank-you)
  - [Other Code Extensions by spmeesseman](#other-code-extensions-by-spmeesseman)
  - [Donations](#donations)
  - [Development Notes](#development-notes)

## Screenshots by Version

| Original Explorer Tray             | Sidebar View (v1.7)                | Task Type Groups (v1.13)           |
| ---------------------------------- | ---------------------------------- | ---------------------------------- |
| ![ss0](res/taskview1.png?raw=true) | ![ss1](res/taskview2.png?raw=true) | ![ss2](res/taskview3.png?raw=true) |

| Grunt/Gulp in Subfolders (v1.14)   | Npm Commands (v1.16)               | Task Dashed Groups (v1.23)         |
| ---------------------------------- | ---------------------------------- | ---------------------------------- |
| ![ss4](res/taskview4.png?raw=true) | ![ss5](res/taskview5.png?raw=true) | ![ss6](res/taskview6.png?raw=true) |

## Requirements

* Visual Studio Code v1.30+

## Features by Version

* v1.27 - Use gulp and ant to find their respective tasks (configurable on/off) (closes [#105](https://github.com/spmeesseman/vscode-taskexplorer/issues/105))
* v1.26 - Add 'Running Task' status bar message (refs [#47](https://github.com/spmeesseman/vscode-taskexplorer/issues/47))
* v1.25 - Add 'Last Tasks' pseudo-folder (closes [#47](https://github.com/spmeesseman/vscode-taskexplorer/issues/47))
* v1.24 - Add 'Open Terminal' button to running tasks (closes [#23](https://github.com/spmeesseman/vscode-taskexplorer/issues/23))
* v1.23 - Deeper groupings with dashed task groups (Off by default)
* v1.22 - Major performance enhancements - Task Tree / Task Scanning
* v1.21 - Add option to keep terminal open after stopping task (closes [#51](https://github.com/spmeesseman/vscode-taskexplorer/issues/51))
* v1.20 - Add support for restarting task (thanks **antfu**)
* v1.19 - App-Publisher task support for BETA testing
* v1.18 - Add 'Add to excludes' action in task file node context menu
* v1.17 - Add 'Run last task' button to titlebar
* v1.16 - Add npm management tasks to npm file node context menus
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

## Configuring Global Excludes and Apache Ant Includes

The setting *exclude* defines a file/directory pattern or an array of file/directory patterns to ignore using *Glob Patterns* or a valid *File URI*.  The setting applies to all script types.  For example:

* `taskExplorer.exclude: [ "**/.vscode-test/**", "**/vendor/**", "**/out/**", "**/output/**", "/c:/projects/project1/src/theme/test/package.json" ]`

Note that the glob pattern "\*\*/node_modules/\*\*" is applied by default to the excludes list in all cases.  Using the *exclude* configuration can greatly improve performance in large workspaces if configured correctly.

Task files that are found by Task Explorer can also be added to the *excludes* list via the tree node context menu, by right clicking the task file or task group node, and selecting *Add to Excludes*.

**Apache Ant** uses an .xml file extension, the setting *includeAnt* can be used to specify other file names other than [Bb]uild.xml to include as ant files so that all xml files do not need to be searched (slowing down tree refreshes in large workspaces or project with a large number of various xml files).  The setting defines a file pattern or an array of file patterns to include using *Glob Patterns* or a valid *File URI*, for example:

* `taskExplorer.includeAnt: [ "**/extraTasks.xml", "**/scripts/ant/*.xml", "/c:/projects/project1/scripts/test/antetests.xml" ]`

Note that the glob pattern "\*\*/[Bb]uild.xml" is applied by default to the **Ant** includes list in all cases.  If you don't include the asterisked glob pattern `**/` first in the string, files in sub-folders will not be found.

## Ant and Gulp Self-Provided Tasks

By default, a custom parser is used to locate Ant and Gulp tasks in respective files.  This may be fine in most cases, but in cases where the script and/or build files become complex, or there is something in the file that was not coded into the parser, you can use the *ant* and *gulp* programs themselves to find their own tasks.  Note however that turning this on has a negative performance impact when refreshing and providing tasks to the VSCode Task Host.

## Using Groups With A Separator

**EXPERIMENTAL**
The *Groups With Separator* option is simply an extra level of task groupings that can be made based on a configured separation character in the script name.  This option can be turned on/off with the *Group With Sepator* option in Settings, the default is OFF. The default separator is a dash ("-").

For example, consider 10 npm tasks, 5 of which all start with the string *dev-*, 5 of which start with the string *prod-*.  Prior to Version 1.23, this would create 10 individual task nodes within the main npm task node in the task tree:

    npm
        dev-build
        dev-build-server
        dev-build-themes
        dev-cp-from-bin
        dev-clean
        prod-build
        prod-build-server
        prod-build-themes
        prod-cp-from-bin
        prod-clean

By enabling the *Group With Separator* option in Settings and setting the *Group Separator* to a dash ("-") two new grouped nodes would be created underneath the main npm node, one called *dev* and the other called *prod*.  Each of these two sub-nodes of course would contain the respective *dev-* and *prod-* scripts/tasks, minus the prepended group name:

    npm
        dev
            build
            build-server
            build-themes
            cp-from-bin
            clean
        prod
            build
            build-server
            build-themes
            cp-from-bin
            clean

## Internally Provided Tasks vs. VSCode Provided Tasks

The following tasks are provided by VSCode:

* Workspace (.vscode/tasks.json)
* NPM (**/package.json)

All other tasks are internally provided.  Workspace tasks are detected by VSCode in all cases.  However, NPM tasks are detected only if the setting `'Npm -> Auto Detect'` is turned on in VSCode Settings.  By default this is turned on, but if NPM tasks are not displaying, please check this setting, also check the setting that turns npm package management off in favor of Yarn `'Npm -> Package manager'`.  A future release will contain internally provided NPM and Yarn tasks.  Note these tasks are still displayed in the Task Tree, just not "provided" by this extension.

Detection of all internally provided task types can be turned on/off in Settings - `'Task Explorer -> Enable [Tasktype]'`.

## Running bash/sh scripts in Windows Environment

Bash/sh scripts in Windows will have the shell executable automatically set to a bash shell (if the default shell set in VSCode is not bash).  The shell executable used can be set in Settings using the `pathToBash` setting.  If there is no value set in Settings, and Git Bash exists at the default installation installation, Git Bash will be used (MinGW).  If Git Bash does not exist at the default install location, it is assumed the the path to bash.exe is part of the system PATH variable.  If you experience errors running Bash scripts in Windows, please check these items.

## Feedback & Contributing

* Please report any bugs, suggestions or documentation requests via the
  [Issues](https://github.com/spmeesseman/vscode-taskexplorer/issues)
* Feel free to submit
  [Pull Requests](https://github.com/spmeesseman/vscode-taskexplorer/pulls)
* [Contributors](https://github.com/spmeesseman/vscode-taskexplorer/graphs/contributors)

### Rate It - Leave Some Stars

Please rate your experience with stars... [like five of them ;)](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer&ssr=false#review-details)

## Thank You

* The [Material Icon Theme](https://marketplace.visualstudio.com/itemdetails?itemName=PKief.material-icon-theme) for some of the task type icons.
* The author of the [NSIS Extension](https://marketplace.visualstudio.com/items?itemName=idleberg.nsis) idleberg for NSIS graphics.

## Other Code Extensions by spmeesseman

| Package           | Repository                                                 | Marketplace                                                                                                          |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| svn-scm-ext       | [GitHub](https://github.com/spmeesseman/svn-scm-ext)       | [Visual Studio Marketplace](https://marketplace.visualstudio.com/itemdetails?itemName=spmeesseman.svn-scm-ext)       |
| vscode-vslauncher | [GitHub](https://github.com/spmeesseman/vscode-vslauncher) | [Visual Studio Marketplace](https://marketplace.visualstudio.com/itemdetails?itemName=spmeesseman.vscode-vslauncher) |

## Donations

If my work and this extension has made your life easier, consider a [donation](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=YWZXT3KE2L4BA&item_name=taskexplorer&currency_code=USD).  All donations go straight to the *Single Dad ATM*.

## Development Notes

3/25/20 - CI has to be THE most overrated tech on the planet.  CI should be named PA standing for "pain in the ass".  These are personal notes for correcting CI issues that happen seemingly every other release.

When semantic release kindly creates the git version tag, then something bombs, run the following git commands to remove the git tag, remote and local:

    git push origin :v1.26.1
    git tag --delete v1.26.1

Babel runtime:

Errors in release when including babel runtime:

This extension consists of 379 files, out of which 230 are JavaScript files. For performance reasons, you should bundle your extension. You should also exclude unnecessary files by adding them to your `.vscodeignore`.

When messing with babel, and finishing, install/uninstall the runtime:

    npm install @babel/runtime
