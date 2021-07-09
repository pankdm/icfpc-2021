#!/bin/bash

function log {
  echo ">>> " $@
}

if ! command -v yarn &> /dev/null
then
    log "`yarn` not found. installing..."
    brew install yarn
    log "`yarn` installed."
else
    log "`yarn` already instaled."
fi

log "pulling dependencies..."
log
yarn install
log
log
log "done."
log 'Launch app locally with `yarn dev`.'
