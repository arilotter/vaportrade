{ pkgs ? import <nixpkgs> { } }:

with pkgs; mkShell {
  name = "node-dev-shell";
  buildInputs = [
    nodejs_latest
    nodePackages.node-pre-gyp

    pkg-config
    openssl
  ];

  LD_LIBRARY_PATH = "${libuuid.out}/lib:${stdenv.cc.cc.lib}/lib";
}
