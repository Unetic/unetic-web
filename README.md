# Unetic Web

The web interface for [Unetic](https://github.com/Unetic).

`unetic-web` is an Angular/TypeScript frontend for managing Unetic-powered OpenWrt devices.

There is no Node.js runtime on the router. Angular is compiled into static assets and
served directly by OpenWrt's `uhttpd`.

```text
Browser
   │
   ▼
uhttpd / rpcd
   │
   ▼
  ubus
   │
   ▼
unetic-core
```

## Development

Requires Node.js 24+ and npm.

```sh
nix develop
npm ci
npm start
```

Checks:

```sh
npm run format:check
npm test -- --watch=false
npm run build
```

The production application is built for the `/unetic/` base path.

## OpenWrt

`unetic-web` is architecture-independent and packaged as static OpenWrt assets.

Production APKs are published through
[`Unetic/packages`](https://github.com/Unetic/packages).

For local testing:

```sh
scp unetic-web-*.apk root@router:/tmp/
ssh root@router 'apk --allow-untrusted add /tmp/unetic-web-*.apk'
```

Then open:

```text
http://<router-address>/unetic/
```

## License

GPL-2.0-only.
