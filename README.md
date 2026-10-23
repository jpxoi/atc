# ATC Dashboard

A browser-based dashboard for listening to airport ATC streams and viewing METAR weather reports. Airport definitions and radio feeds are maintained in the repository.

## Main technologies

- **Application:** [Astro](https://astro.build/) 7 and TypeScript.
- **Styles:** [Tailwind CSS](https://tailwindcss.com/) 4.
- **External sources:** LiveATC audio streams and METAR-TAF weather embeds.

## Getting started

### Requirements

- Node.js 24.
- pnpm, using the version declared in `packageManager` in [package.json](./package.json). Enable Corepack with `corepack enable` if needed.
- Portless, installed globally with `pnpm add -g portless` ([documentation](https://portless.sh/)).

### Installation

```bash
git clone https://github.com/jpxoi/atc.git
cd atc
pnpm install
```

### Local development

Portless is the standard local development tool:

```bash
portless run
```

It runs the `dev` script and derives `atc-dashboard` from `package.json`. Open `https://atc-dashboard.localhost`.

To access the application from another device on the same network:

```bash
portless run --lan
```

LAN mode uses `https://atc-dashboard.local`. The other device must trust the [Portless local CA](https://portless.sh/https).

To share the application through ngrok, install and authenticate the ngrok CLI, then run:

```bash
portless run --ngrok
```

Use the public URL printed by Portless or listed by `portless list`.

## Development

### Checks

```bash
pnpm check
```

This runs `astro check`. The project does not define formatting, linting, or automated test scripts.

### Airport configuration

Edit [src/data/airports.ts](./src/data/airports.ts) to add airports, update stream mounts and frequencies, or change `DEFAULT_ICAO`. Audio playback lives in [src/lib/atc-player.ts](./src/lib/atc-player.ts); weather embeds are configured in [src/lib/metar.ts](./src/lib/metar.ts).

The application currently needs no environment variables or API tokens. Audio and weather availability depend on the external providers; their content is not covered by this project's license.

## Deployment

```bash
pnpm build
pnpm preview
```

Astro generates a static site in `dist/`. Deploy that directory to a static hosting provider. `preview` serves the generated output locally.

## Contributing

Use a branch from `main` with a descriptive name, such as `feat/airport-name` or `fix/audio-player`. Use Conventional Commits and run `pnpm check` before opening a pull request.

## License

Copyright (c) 2026 Jean Paul Fernandez. Licensed under the [GNU General Public License v3.0](./LICENSE) (GPL-3.0-only).
