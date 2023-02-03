#!/bin/bash

cd "$(dirname ${BASH_SOURCE[0]})"
cd ..

ENABLE=1
if [ ! -z $1 ] ; then
    ENABLE=0
fi

LOGFILE=''
if [ -z $2 ] ; then
    LOGFILE=$3
fi

if [ $ENABLE = 1 ]; then
  sed -i ':a;N;$!ba;s/"activationEvents": \[[ \r\n\t]*"onView\:taskExplorer",[ \r\n\t]*"onView:taskExplorerSideBar",[ \r\n\t]*"onView:taskExplorer.views.home",[ \r\n\t]*"onView:taskExplorer.views.taskCount"/"activationEvents": []/g' package.json
  #sed -i ':a;N;$!ba;s/"activationEvents": \[[ \r\n\t]*"\*"/"activationEvents": []/g' package.json
  sed -i ':a;N;$!ba;s/]\n[ ]*],/],/g' package.json
fi

if [ $ENABLE = 0 ]; then
  sed -i 's/"activationEvents": \[]/"activationEvents": [\n        "onView:taskExplorer",\n        "onView:taskExplorerSideBar",\n        "onView:taskExplorer.views.home",\n        "onView:taskExplorer.views.taskCount"\n    ]/g' package.json
  #sed -i 's/"activationEvents": \[]/"activationEvents": [\n        "*"\n    ]/g' package.json
fi
