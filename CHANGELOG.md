## [1.14.7](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.14.6...v1.14.7) (2019-04-19)


### Bug Fixes

* stop processing a views events if it was turned off in settings ([aed18ac](https://github.com/spmeesseman/vscode-taskexplorer/commit/aed18ac))
* task nodes within a task type group in the tree are not alphabetized correctly ([a9d66ff](https://github.com/spmeesseman/vscode-taskexplorer/commit/a9d66ff))
* task tree does not auto refresh when nsis files are created/edited ([a316843](https://github.com/spmeesseman/vscode-taskexplorer/commit/a316843))
* when a script type task is edited (batch, bash, perl, etc), do not refresh the tree ui ([f40e970](https://github.com/spmeesseman/vscode-taskexplorer/commit/f40e970))


### Performance Improvements

* reduce tree refresh time by 20-40% after editing a task file ([1f1e054](https://github.com/spmeesseman/vscode-taskexplorer/commit/1f1e054))

## [1.14.6](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.14.5...v1.14.6) (2019-04-18)


### Performance Improvements

* after edit a task file, invalidate only that task tree node ([554394b](https://github.com/spmeesseman/vscode-taskexplorer/commit/554394b))

## [1.14.5](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.14.4...v1.14.5) (2019-04-17)


### Bug Fixes

* (1) grunt and gulp tasks found in subdirectories of the project root throw an error when ran, (2) tasks whose name occurs on a newline are not found ([1f04979](https://github.com/spmeesseman/vscode-taskexplorer/commit/1f04979))
* gruntfiles and gulpfiles that are not all lowercase are not found ([b9e397d](https://github.com/spmeesseman/vscode-taskexplorer/commit/b9e397d))
* makefile target parsing fails if a target name exists elsewhere in the file ([f7fb40d](https://github.com/spmeesseman/vscode-taskexplorer/commit/f7fb40d))
* running an nsis task uses nsis.exe, should use makensis.exe ([f1598d4](https://github.com/spmeesseman/vscode-taskexplorer/commit/f1598d4))

## [1.14.4](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.14.3...v1.14.4) (2019-04-16)


### Bug Fixes

* running a composite task (no shell) displays loading icon and stop icon, and is stuck in that state. ([d346c09](https://github.com/spmeesseman/vscode-taskexplorer/commit/d346c09))
* starting and stopping a task is invalidating the tree before refreshing. ([32abff3](https://github.com/spmeesseman/vscode-taskexplorer/commit/32abff3))

## [1.14.3](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.14.2...v1.14.3) (2019-04-15)


### Bug Fixes

* exclude globs have no effect on typescript tasks in subfolders ([75bcbda](https://github.com/spmeesseman/vscode-taskexplorer/commit/75bcbda))
* grouped nodes have a tooltip of one of the task files within ([6d02dd5](https://github.com/spmeesseman/vscode-taskexplorer/commit/6d02dd5))

## [1.14.2](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.14.1...v1.14.2) (2019-04-15)


### Bug Fixes

* gulp and grunt tasks in subdirs display incorrect task name. ([3d3f5bd](https://github.com/spmeesseman/vscode-taskexplorer/commit/3d3f5bd))
* refreshing task tree does not pick up new task files ([289c110](https://github.com/spmeesseman/vscode-taskexplorer/commit/289c110))

## [1.14.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.14.0...v1.14.1) (2019-04-14)


### Bug Fixes

* changing debug level in settings does not affect log output ([ce660bd](https://github.com/spmeesseman/vscode-taskexplorer/commit/ce660bd))
* nsis type tasks are not found unless the idleberg.nsis extension is installed ([c2c36ef](https://github.com/spmeesseman/vscode-taskexplorer/commit/c2c36ef))


### Code Refactoring

* double check exclsuion after finding scripts - vscode findFiles is case sensitive glabs ([cb0c5f5](https://github.com/spmeesseman/vscode-taskexplorer/commit/cb0c5f5))


### Documentation

* **todo:** update completed tasks, add gradle task support ([3154e5b](https://github.com/spmeesseman/vscode-taskexplorer/commit/3154e5b))
* **readme:** update screenshots ([af5232a](https://github.com/spmeesseman/vscode-taskexplorer/commit/af5232a))


### Performance Improvements

* apply excludes glob list to the underlying  file search for faster tree loading. ([87588a5](https://github.com/spmeesseman/vscode-taskexplorer/commit/87588a5))

# [1.14.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.13.3...v1.14.0) (2019-04-13)


### Documentation

* **todo:** rename todo file to . convention [skip ci] ([6324dea](https://github.com/spmeesseman/vscode-taskexplorer/commit/6324dea))
* **todo:** update 1.14 finished tasks ([e938d32](https://github.com/spmeesseman/vscode-taskexplorer/commit/e938d32))
* **readme:** update screenshots ([2dd81e0](https://github.com/spmeesseman/vscode-taskexplorer/commit/2dd81e0))
* **readme:** update v1.14 info ([8c69e32](https://github.com/spmeesseman/vscode-taskexplorer/commit/8c69e32))


### Features

* add support for grunt and gulp files not located in project root ([ced2462](https://github.com/spmeesseman/vscode-taskexplorer/commit/ced2462))

## [1.13.3](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.13.2...v1.13.3) (2019-04-11)


### Bug Fixes

* task tree does not auto refresh when enabling/disabling certain task types in settings ([256df86](https://github.com/spmeesseman/vscode-taskexplorer/commit/256df86))
* task tree doesnt refresh after editing a task file for most task types ([64208a2](https://github.com/spmeesseman/vscode-taskexplorer/commit/64208a2))
* tree refreshes multiple times when settings change ([2fdd0ea](https://github.com/spmeesseman/vscode-taskexplorer/commit/2fdd0ea))


### Documentation

* **todo:** update ([a80380f](https://github.com/spmeesseman/vscode-taskexplorer/commit/a80380f))
* **todo:** update info ([e578f6d](https://github.com/spmeesseman/vscode-taskexplorer/commit/e578f6d))
* **todo:** updated info ([abfee5f](https://github.com/spmeesseman/vscode-taskexplorer/commit/abfee5f))

## [1.13.2](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.13.1...v1.13.2) (2019-04-11)


### Bug Fixes

* cant run install command on npm nodes that are not in the project root ([2b0c091](https://github.com/spmeesseman/vscode-taskexplorer/commit/2b0c091))


### Code Refactoring

* include deactivate() implementation in extension ([e5aed57](https://github.com/spmeesseman/vscode-taskexplorer/commit/e5aed57))


### Documentation

* **readme:** fix screenshot table layout ([3ef94e7](https://github.com/spmeesseman/vscode-taskexplorer/commit/3ef94e7))

## [1.13.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.13.0...v1.13.1) (2019-04-10)


### Bug Fixes

* node icon for ant tasks is not centered ([532f4e8](https://github.com/spmeesseman/vscode-taskexplorer/commit/532f4e8))


### Build System

* **conventional-changelog-spm:** update to 1.1.4 ([7a1ee94](https://github.com/spmeesseman/vscode-taskexplorer/commit/7a1ee94))


### Documentation

* **todo:** update [skip ci] ([e7b9933](https://github.com/spmeesseman/vscode-taskexplorer/commit/e7b9933))
* **readme:** update 1.13 info, add note about icon set ([92be78c](https://github.com/spmeesseman/vscode-taskexplorer/commit/92be78c))
* **readme:** update screenshots ([09b7f1f](https://github.com/spmeesseman/vscode-taskexplorer/commit/09b7f1f))


### Minor Features

* add "Open [taskname]" tooltip when hover over task nodes ([7ebe446](https://github.com/spmeesseman/vscode-taskexplorer/commit/7ebe446))

# [1.13.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.12.6...v1.13.0) (2019-04-09)


### Bug Fixes

* multi-root groupings not working for some tasks after feature merge ([a721e66](https://github.com/spmeesseman/vscode-taskexplorer/commit/a721e66))


### Documentation

* **todo:** update [skip ci] ([78125ee](https://github.com/spmeesseman/vscode-taskexplorer/commit/78125ee))
* **todo:** update [skip ci] ([ba4669e](https://github.com/spmeesseman/vscode-taskexplorer/commit/ba4669e))
* **todo:** update [skip ci] ([0a422b1](https://github.com/spmeesseman/vscode-taskexplorer/commit/0a422b1))


### Features

* add taskfile group nodes ([53ac139](https://github.com/spmeesseman/vscode-taskexplorer/commit/53ac139))

## [1.12.6](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.12.5...v1.12.6) (2019-04-08)


### Bug Fixes

* make glob pattern excludes case insensitive ([4104252](https://github.com/spmeesseman/vscode-taskexplorer/commit/4104252))


### Documentation

* **readme:** update info and default path excludes [skip ci] ([e88471f](https://github.com/spmeesseman/vscode-taskexplorer/commit/e88471f))

## [1.12.5](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.12.4...v1.12.5) (2019-04-08)


### Bug Fixes

* **settings:** fix blank label ([e0d34d4](https://github.com/spmeesseman/vscode-taskexplorer/commit/e0d34d4))


### Code Refactoring

* lighten ant icon in file nodes to gray ([1ea196d](https://github.com/spmeesseman/vscode-taskexplorer/commit/1ea196d))
* sort task file nodes by task source ([a39dbf2](https://github.com/spmeesseman/vscode-taskexplorer/commit/a39dbf2))


### Documentation

* **readme:** reorder badges, place gk badge next to dep status badges ([de16924](https://github.com/spmeesseman/vscode-taskexplorer/commit/de16924))
* **todo:** update info ([a91d283](https://github.com/spmeesseman/vscode-taskexplorer/commit/a91d283))

## [1.12.4](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.12.3...v1.12.4) (2019-04-08)


### Documentation

* **readme:** fixed todo link ([a26bc4c](https://github.com/spmeesseman/vscode-taskexplorer/commit/a26bc4c))

## [1.12.3](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.12.2...v1.12.3) (2019-04-07)


### Bug Fixes

* add settings for specifying script intepreter location ([cda2c2e](https://github.com/spmeesseman/vscode-taskexplorer/commit/cda2c2e))


### Code Refactoring

* update todo ([735da5e](https://github.com/spmeesseman/vscode-taskexplorer/commit/735da5e))


### Documentation

* **readme:**  add link to todos ([5d39799](https://github.com/spmeesseman/vscode-taskexplorer/commit/5d39799))

## [1.12.2](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.12.1...v1.12.2) (2019-04-06)


### Bug Fixes

* task file labels still show uppercase letters ([4e91243](https://github.com/spmeesseman/vscode-taskexplorer/commit/4e91243))


### Build System

* **npm:** bump min version conventional-changelog-spm to 1.1.2 ([d081678](https://github.com/spmeesseman/vscode-taskexplorer/commit/d081678))
* **npm:** bump min version of conventional-changelog-spm to 1.1.3 ([7794095](https://github.com/spmeesseman/vscode-taskexplorer/commit/7794095))


### Documentation

* **readme:** add new settings descriptions ([3f46d5f](https://github.com/spmeesseman/vscode-taskexplorer/commit/3f46d5f))

## [1.12.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.12.0...v1.12.1) (2019-04-06)


### Build System

* **npm:** add dev dependency conventional-changelog-spm ([fd35851](https://github.com/spmeesseman/vscode-taskexplorer/commit/fd35851))
* **semantic-release:** cleanup config file ([23673d1](https://github.com/spmeesseman/vscode-taskexplorer/commit/23673d1))
* **semantic-release:** use separate releaserc.json config ([cb93891](https://github.com/spmeesseman/vscode-taskexplorer/commit/cb93891))
* **semantic-release:** use spm custom changelog preset ([a58a6c7](https://github.com/spmeesseman/vscode-taskexplorer/commit/a58a6c7))


### Code Refactoring

* lowercase file item labels ([6a1a86b](https://github.com/spmeesseman/vscode-taskexplorer/commit/6a1a86b))


### Documentation

* **readme:** update coming soon and test check in name [skip ci] ([5d4432b](https://github.com/spmeesseman/vscode-taskexplorer/commit/5d4432b))
* **readme:** update coming soon, test checkin username [skip ci] ([843e329](https://github.com/spmeesseman/vscode-taskexplorer/commit/843e329))

# [1.12.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.11.2...v1.12.0) (2019-04-06)


### Features

* add support for bash, python, perl, powershell, nsis, and ruby scripts ([17244d1](https://github.com/spmeesseman/vscode-taskexplorer/commit/17244d1))

## [1.11.2](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.11.1...v1.11.2) (2019-04-06)


### Bug Fixes

* make run install command from npm node asynchronous ([eb52c7e](https://github.com/spmeesseman/vscode-taskexplorer/commit/eb52c7e))
* run install command does not work in npm file node context menu ([a9895b3](https://github.com/spmeesseman/vscode-taskexplorer/commit/a9895b3))

## [1.11.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.11.0...v1.11.1) (2019-04-05)

# [1.11.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.10.0...v1.11.0) (2019-04-05)


### Features

* add support for batch scripts ([24b1bbb](https://github.com/spmeesseman/vscode-taskexplorer/commit/24b1bbb))
* auto prompt for script cmd line args ([7f99598](https://github.com/spmeesseman/vscode-taskexplorer/commit/7f99598))

# [1.10.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.9.3...v1.10.0) (2019-04-04)


### Bug Fixes

* register run install command for npm ([02d04b9](https://github.com/spmeesseman/vscode-taskexplorer/commit/02d04b9))
* run install command should be only for npm file nodes ([b1938e8](https://github.com/spmeesseman/vscode-taskexplorer/commit/b1938e8))
* wordage in settings for show view type ([acb3ea2](https://github.com/spmeesseman/vscode-taskexplorer/commit/acb3ea2))


### Features

* add support for makefile targets as tasks ([b75dbd5](https://github.com/spmeesseman/vscode-taskexplorer/commit/b75dbd5))

## [1.9.3](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.9.2...v1.9.3) (2019-04-04)


### Bug Fixes

* 'open' grunt tasks does not position cursor on task properly ([7a5a474](https://github.com/spmeesseman/vscode-taskexplorer/commit/7a5a474))
* enable/disable script types in settings has no effect ([02c08d2](https://github.com/spmeesseman/vscode-taskexplorer/commit/02c08d2))
* util camelcase fn returns invalud value ([2da68e9](https://github.com/spmeesseman/vscode-taskexplorer/commit/2da68e9))

## [1.9.2](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.9.1...v1.9.2) (2019-04-03)


### Bug Fixes

* task names with a dash surrounded by spaces ( - ) are being cut off in display ([4d72df7](https://github.com/spmeesseman/vscode-taskexplorer/commit/4d72df7))

## [1.9.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.9.0...v1.9.1) (2019-04-03)


### Bug Fixes

* exclude paths are working on some paths but not on others ([5dc7691](https://github.com/spmeesseman/vscode-taskexplorer/commit/5dc7691))
* tsc each task name displays relative path instead of file node ([757e4cb](https://github.com/spmeesseman/vscode-taskexplorer/commit/757e4cb))

# [1.9.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.8.0...v1.9.0) (2019-04-03)


### Bug Fixes

* for ant files display file name on task file node if not named build.xml ([70d773f](https://github.com/spmeesseman/vscode-taskexplorer/commit/70d773f))
* logValue for output window doesnt log empty string ([421bfd6](https://github.com/spmeesseman/vscode-taskexplorer/commit/421bfd6))
* task file cannot be found when opening if filename is not all lowercase ([9672798](https://github.com/spmeesseman/vscode-taskexplorer/commit/9672798))


### Features

* gulp task detection support ([5f05830](https://github.com/spmeesseman/vscode-taskexplorer/commit/5f05830))

# [1.8.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.7.8...v1.8.0) (2019-04-02)


### Bug Fixes

* empty file labeled as an ant file causes extension to stop working after parsing ([2051532](https://github.com/spmeesseman/vscode-taskexplorer/commit/2051532))
* make exclude setting non-resource type ([7cb2740](https://github.com/spmeesseman/vscode-taskexplorer/commit/7cb2740))


### Features

* add new setting to parse ant files not named B/build.xml ([4253452](https://github.com/spmeesseman/vscode-taskexplorer/commit/4253452))

## [1.7.8](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.7.7...v1.7.8) (2019-04-01)


### Bug Fixes

* ansicon for ant output colorization ([acf17fc](https://github.com/spmeesseman/vscode-taskexplorer/commit/acf17fc))
* vscode tasks of type 'npm' are not found when ran ([1b4ca1d](https://github.com/spmeesseman/vscode-taskexplorer/commit/1b4ca1d))


### Performance Improvements

* remove command lookups for tooltips in npm scripts for faster loading time in large workspaces ([77edcc4](https://github.com/spmeesseman/vscode-taskexplorer/commit/77edcc4))

## [1.7.7](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.7.6...v1.7.7) (2019-04-01)


### Bug Fixes

* extension stops working after reading an Ant build file with no targets ([76a0593](https://github.com/spmeesseman/vscode-taskexplorer/commit/76a0593))

## [1.7.6](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.7.5...v1.7.6) (2019-03-31)


### Bug Fixes

* change package icon color ([0ed4bea](https://github.com/spmeesseman/vscode-taskexplorer/commit/0ed4bea))

## [1.7.5](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.7.4...v1.7.5) (2019-03-30)


### Bug Fixes

* call destroyAllTempPath breaks promise if there are no temp dirs ([cd4e711](https://github.com/spmeesseman/vscode-taskexplorer/commit/cd4e711))
* refresh button in sidebar is missing ([0cbb946](https://github.com/spmeesseman/vscode-taskexplorer/commit/0cbb946))


### Performance Improvements

* remove jsonprovider requests to npmjs ([db037df](https://github.com/spmeesseman/vscode-taskexplorer/commit/db037df))

## [1.7.4](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.7.3...v1.7.4) (2019-03-30)

## [1.7.3](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.7.2...v1.7.3) (2019-03-30)

## [1.7.2](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.7.1...v1.7.2) (2019-03-30)

## [1.7.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.7.0...v1.7.1) (2019-03-30)


### Bug Fixes

* double text in sidebar view title ([436a826](https://github.com/spmeesseman/vscode-taskexplorer/commit/436a826))

# [1.7.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.6.0...v1.7.0) (2019-03-30)


### Features

* add sidebar view ([2595a39](https://github.com/spmeesseman/vscode-taskexplorer/commit/2595a39))

# [1.6.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.21...v1.6.0) (2019-03-30)


### Features

* display status for running task, stop running tasks ([4cf8af9](https://github.com/spmeesseman/vscode-taskexplorer/commit/4cf8af9))


### Performance Improvements

* make logging asynchronous ([c080a3d](https://github.com/spmeesseman/vscode-taskexplorer/commit/c080a3d))

## [1.5.21](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.20...v1.5.21) (2019-03-29)

## [1.5.20](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.19...v1.5.20) (2019-03-29)

## [1.5.19](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.18...v1.5.19) (2019-03-29)

## [1.5.18](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.17...v1.5.18) (2019-03-29)

## [1.5.17](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.16...v1.5.17) (2019-03-29)

## [1.5.16](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.15...v1.5.16) (2019-03-29)


### Performance Improvements

* set logging to false on install ([0c4696c](https://github.com/spmeesseman/vscode-taskexplorer/commit/0c4696c))

## [1.5.15](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.14...v1.5.15) (2019-03-29)

## [1.5.14](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.13...v1.5.14) (2019-03-29)

## [1.5.13](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.12...v1.5.13) (2019-03-29)

## [1.5.12](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.11...v1.5.12) (2019-03-29)


### Bug Fixes

* display correct extension name in error messages ([668d15a](https://github.com/spmeesseman/vscode-taskexplorer/commit/668d15a))
* show correct extension name in output window ([df1283a](https://github.com/spmeesseman/vscode-taskexplorer/commit/df1283a))

## [1.5.11](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.10...v1.5.11) (2019-03-28)

## [1.5.10](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.9...v1.5.10) (2019-03-28)

## [1.5.9](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.8...v1.5.9) (2019-03-28)

## [1.5.8](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.7...v1.5.8) (2019-03-28)

## [1.5.7](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.6...v1.5.7) (2019-03-28)


### Bug Fixes

* the open command for any task group other than npm does not work ([30fedc0](https://github.com/spmeesseman/vscode-taskexplorer/commit/30fedc0))

## [1.5.6](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.5...v1.5.6) (2019-03-28)

## [1.5.5](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.4...v1.5.5) (2019-03-28)

## [1.5.4](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.3...v1.5.4) (2019-03-28)

## [1.5.3](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.2...v1.5.3) (2019-03-28)


### Performance Improvements

* remove built in npm task provider, use vscode internal npm task provider ([221fa9d](https://github.com/spmeesseman/vscode-taskexplorer/commit/221fa9d))

## [1.5.2](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.1...v1.5.2) (2019-03-28)


### Bug Fixes

* ant files named Build.xml are not recognized, only build.xml ([66c0fc2](https://github.com/spmeesseman/vscode-taskexplorer/commit/66c0fc2))
* non-target xml nodes with name parameter are showing as targets ([85c734d](https://github.com/spmeesseman/vscode-taskexplorer/commit/85c734d))

## [1.5.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.5.0...v1.5.1) (2019-03-27)


### Performance Improvements

* remove tooltip loading for vscode tasks and ant targets ([64e7033](https://github.com/spmeesseman/vscode-taskexplorer/commit/64e7033))

# [1.5.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.4.1...v1.5.0) (2019-03-27)


### Bug Fixes

* (1) open command for ant targets found in subfolders of project root. (2) invalid path displayed in view ([09c7a27](https://github.com/spmeesseman/vscode-taskexplorer/commit/09c7a27))
* cannot launch ant tasks if build.xml is not in root project folder ([24d0c8d](https://github.com/spmeesseman/vscode-taskexplorer/commit/24d0c8d))


### Features

* add ansicon support, override ant path ([f36b612](https://github.com/spmeesseman/vscode-taskexplorer/commit/f36b612))
* name file tree nodes with respective task types, put relative paths in parenthesis ([f558d68](https://github.com/spmeesseman/vscode-taskexplorer/commit/f558d68))

## [1.4.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.4.0...v1.4.1) (2019-03-27)


### Bug Fixes

* add required new xml2js runtime dep. ([91a1422](https://github.com/spmeesseman/vscode-taskexplorer/commit/91a1422))

# [1.4.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.3.5...v1.4.0) (2019-03-27)


### Features

* add ant target support ([bba8552](https://github.com/spmeesseman/vscode-taskexplorer/commit/bba8552))

## [1.3.5](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.3.4...v1.3.5) (2019-03-27)


### Bug Fixes

* open command for vs code tasks ([1a9b374](https://github.com/spmeesseman/vscode-taskexplorer/commit/1a9b374))

## [1.3.4](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.3.3...v1.3.4) (2019-03-27)

## [1.3.3](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.3.2...v1.3.3) (2019-03-27)

## [1.3.2](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.3.1...v1.3.2) (2019-03-26)

## [1.3.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.3.0...v1.3.1) (2019-03-26)

# [1.3.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.2.0...v1.3.0) (2019-03-26)


### Features

* add collapse all button ([58204e9](https://github.com/spmeesseman/vscode-taskexplorer/commit/58204e9))

# [1.2.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.1.0...v1.2.0) (2019-03-26)


### Features

* bulk check in initial replica of vscode npm scripts explorer view, but with tasks [skip ci] ([dac97c1](https://github.com/spmeesseman/vscode-taskexplorer/commit/dac97c1))

# [1.1.0](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.0.2...v1.1.0) (2019-03-26)


### Bug Fixes

* invalid console.log ([07169ce](https://github.com/spmeesseman/vscode-taskexplorer/commit/07169ce))
* rogue text ([d6f2597](https://github.com/spmeesseman/vscode-taskexplorer/commit/d6f2597))


### Features

* first round of changes [skip ci] ([a06ed57](https://github.com/spmeesseman/vscode-taskexplorer/commit/a06ed57))

## [1.0.2](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.0.1...v1.0.2) (2019-03-26)

## [1.0.1](https://github.com/spmeesseman/vscode-taskexplorer/compare/v1.0.0...v1.0.1) (2019-03-26)

# 1.0.0 (2019-03-26)
