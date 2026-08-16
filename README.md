# Unetic Web

The Angular web interface for Unetic. It will communicate with Unetic Core over
ubus through uhttpd and use rpcd for authentication.

Repository: <https://github.com/Unetic/unetic-web>

## Development

```sh
nix develop
npm ci
npm start
```

Development runs entirely on the developer machine. When router RPC calls are
added, use Angular's development proxy to forward only the ubus endpoint to a
test router; do not install Node.js on OpenWrt or rebuild an APK for CSS edits.

## OpenWrt package

`npm run build` produces static files in `dist/unetic-web/browser` with the
base path `/unetic/`. The OpenWrt package installs only those files under
`/www/unetic`; uhttpd serves them without a Node.js runtime.

CI builds the architecture-independent APK with `PKGARCH:=all` using the pinned
OpenWrt 25.12.5 SDK. The version comes from `package.json`; tagged releases such
as `v0.1.0` attach the package.

Install a downloaded development artifact with:

```sh
scp unetic-web-*.apk root@router:/tmp/
ssh root@router 'apk --allow-untrusted add /tmp/unetic-web-*.apk && rm -f /tmp/unetic-web-*.apk'
```

No router reboot or service restart is required. `--allow-untrusted` is only
for local development artifacts; the future public feed will be signed.
