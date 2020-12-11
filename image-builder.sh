#!/bin/bash
set -e

function build_and_push_image () {
  local BALENA_ARCH=$1
  local DOCKER_ARCH=$2

  echo "Building for arch name $BALENA_ARCH, platform $DOCKER_ARCH pushing to $DOCKER_REPO/$REPO_NAME"

  sed "s/%%BALENA_ARCH%%/$BALENA_ARCH/g" ./Dockerfile.template > ./Dockerfile.$BALENA_ARCH
  docker buildx build -t $DOCKER_REPO/$REPO_NAME:$BALENA_ARCH --platform $DOCKER_ARCH --file Dockerfile.$BALENA_ARCH .

  echo "Publishing..."
  docker push $DOCKER_REPO/$REPO_NAME:$BALENA_ARCH

  echo "Cleaning up..."
  rm Dockerfile.$BALENA_ARCH
}

# You can pass in a repo (such as a test docker repo) or accept the default
DOCKER_REPO=${1:-balenablocks}
REPO_NAME="balena-electron-env"

build_and_push_image "aarch64" "linux/arm64"
build_and_push_image "armv7hf" "linux/arm/v7"
build_and_push_image "amd64" "linux/amd64"
