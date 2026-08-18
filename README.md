# Unetic Web

Angular web interface for Unetic.

Repository: <https://github.com/Unetic/unetic-web>

## Development

```sh
nix develop
npm ci
npm start
```

Router production does not require Node.js. Angular produces static files served by OpenWrt under `/unetic/`.

## CI

Normal pushes and pull requests run dependency install, formatting checks, unit tests and a production build. CI has no publishing side effects.

## Release

A tag `vX.Y.Z` must match `package.json`. The release workflow runs mandatory CI and performs exactly one production Angular build for the effective release run. The exact tested `dist/` is archived as:

```text
unetic-web-dist-X.Y.Z.tar.gz
SHA256SUMS
```

That dist is the reusable production input for every OpenWrt architecture/version. `Unetic/packages` never checks out web source for production packaging and never runs npm/Angular.

The OpenWrt web package uses `PKGARCH:=all`. `Unetic/packages` wraps the already-built dist into the APK and publishes the signed repository. The component repository itself does not publish APKs.
