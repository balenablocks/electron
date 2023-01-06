target "aarch64" {
  dockerfile = "platforms/Dockerfile.aarch64"
  tags = ["docker.io/balenablocks/aarch64-balena-electron-env"]
  platforms = ["linux/arm64"]
}

target "armv7hf" {
  dockerfile = "platforms/Dockerfile.armv7hf"
  tags = ["docker.io/balenablocks/armv7hf-balena-electron-env"]
  platforms = ["linux/arm/v7"]
}

target "amd64" {
  dockerfile = "platforms/Dockerfile.amd64"
  tags = ["docker.io/balenablocks/amd64-balena-electron-env"]
  platforms = ["linux/amd64"]
}