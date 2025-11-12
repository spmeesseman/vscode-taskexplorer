
# Task Explorer Settings

- [Task Explorer Settings](#task-explorer-settings)
  - [Configuring Global Excludes, Apache Ant and Bash Globs](#configuring-global-excludes-apache-ant-and-bash-globs)


## Configuring Global Excludes, Apache Ant and Bash Globs

The setting *exclude* defines a file/directory pattern or an array of file/directory patterns to ignore using *Glob Patterns* or a valid *File URI*.  The setting applies to all script types.  For example:

- `taskexplorer.exclude: [ "**/.vscode-test/**", "**/vendor/**", "**/out/**", "**/output/**", "/c:/projects/project1/src/theme/test/package.json" ]`

Note that the glob pattern "\*\*/node_modules/\*\*" is applied by default to the excludes list in all cases.  Using the *exclude* configuration can greatly improve performance in large workspaces if configured correctly.

Task files that are found by Task Explorer can also be added to the *excludes* list via the tree node context menu, by right clicking the task file or task group node, and selecting *Add to Excludes*.

**Apache Ant** uses an .xml file extension, the setting *globPatternsAnt* can be used to specify other file names other than [Bb]uild.xml to include as ant files so that all xml files do not need to be searched (slowing down tree refreshes in large workspaces or project with a large number of various xml files).  The setting defines a file pattern or an array of file patterns to include using *Glob Patterns* or a valid *File URI*, for example:

- `taskexplorer.globPatternsAnt: [ "**/extraTasks.xml", "**/scripts/ant/*.xml", "/c:/projects/project1/scripts/test/antetests.xml" ]`

Note that the glob pattern "\*\*/[Bb]uild.xml" is applied by default to the **Ant** includes list in all cases.  If you don't include the asterisked glob pattern `**/` first in the string, files in sub-folders will not be found.

In the same way as for **Ant** tasks, **Bash** scripts without extensions can be configured to be found by the Bash Task Provider by using glob patterns in the same way, with the *globPatternsBash* setting:

- `taskexplorer.globPatternsBash: [ "**/bash_scripts/**", "**/sh/scripts/**", "/usr/local/bin/start_task" ]`
