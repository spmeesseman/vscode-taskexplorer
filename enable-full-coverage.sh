#!/bin/bash

cd "$(dirname ${BASH_SOURCE[0]})"

echo ${BASH_SOURCE[0]}

ENABLE=1
if [ ! -z $1 ] ; then
    ENABLE=0
fi

if [ $ENABLE = 1 ]; then
  sed -i 's/"activationEvents": \[[ \r\n\t]*"\*"[ \r\n\t]*]/"activationEvents": []/gm' package.json
fi

if [ $ENABLE = 0 ]; then
  sed -i 's/"activationEvents": \[]/"activationEvents": [ "*" ]/g' package.json
fi

