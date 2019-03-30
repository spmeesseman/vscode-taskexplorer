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
