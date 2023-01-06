#!/bin/bash
set -e

function update_platforms () {
  local BALENA_ARCH=$1
  local DOCKER_ARCH=$2

  sed "s/%%BALENA_ARCH%%/$BALENA_ARCH/g" ./Dockerfile.template > ./platforms/Dockerfile.$BALENA_ARCH
}

update_platforms "aarch64" "linux/arm64"
update_platforms "armv7hf" "linux/arm/v7"
update_platforms "amd64" "linux/amd64"