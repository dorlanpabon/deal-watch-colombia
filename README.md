# Deal Watch Colombia

Watcher configurable para encontrar ofertas reales en tiendas y marketplaces usados desde Colombia. El preset por defecto busca MacBook Pro M4/M5 con minimo 18 GB de RAM, pero las busquedas, filtros, fuentes y umbrales viven en `config.json`.

Nombre sugerido para el repo publico:

```text
deal-watch-colombia
```

## Que hace

- Busca productos en varias fuentes.
- Estima costo puesto en Colombia para compras internacionales.
- Filtra por precio maximo, precio minimo sospechoso, RAM, chip, palabras requeridas y palabras rechazadas.
- Guarda vistos en `data/seen.json` para alertar solo novedades en modo `watch`.
- Alerta por consola, Telegram o Discord.
- Bloquea imagenes, fuentes, media y trackers en navegador para cargar mas rapido.

## Fuentes

- MercadoLibre Colombia por navegador con sesion persistente.
- MercadoLibre API y `@dan1d/mercadolibre-mcp` como fuentes separadas de diagnostico.
- eBay por navegador, con importacion estimada.
- Enjoy VideoGames, EasyMac y Tecnoplaza por HTTP.
- iShop Colombia y Mac Center por Shopify Suggest API.
- Alkosto, Ktronix y Falabella Colombia por navegador.
- Patchright separado y desactivado por defecto.

## Instalacion

```powershell
npm install
npm run browser:install
Copy-Item config.example.json config.json
Copy-Item .env.example .env
```

Patchright es opcional:

```powershell
npm run patchright:install
npm run patchright:check
```

## Uso

```powershell
npm run search
npm run watch
```

CLI directo:

```powershell
npx deal-watch-colombia search
npx deal-watch-colombia watch --interval-minutes 30
```

Overrides rapidos:

```powershell
node src/cli.js search --query "MacBook Pro M5 24GB" --max-landed-cop 8500000
node src/cli.js search --query "iPhone 16 Pro Max 256GB" --require-mac-book-pro false --chips "" --min-ram-gb 0 --reject-unknown-ram false --required-term "iphone,16"
node src/cli.js search --config config.iphone.example.json
```

## Configuracion

El preset MacBook esta en `config.example.json`:

```json
{
  "profile": "macbook-pro-m4-m5-colombia",
  "queries": [
    "MacBook Pro M4 24GB",
    "MacBook Pro M4 Pro 24GB",
    "MacBook Pro M4 Max 36GB",
    "MacBook Pro M5 24GB",
    "MacBook Pro M5 Pro 24GB"
  ],
  "criteria": {
    "requiredTerms": [],
    "minRamGb": 18,
    "chips": ["M4", "M5"],
    "requireMacBookPro": true,
    "rejectUnknownRam": true,
    "minLandedCop": 4500000,
    "maxLandedCop": 8500000,
    "greatDealCop": 7200000
  }
}
```

Para otro producto, copia `config.example.json` y cambia:

- `queries`
- `criteria.requiredTerms`
- `criteria.chips`
- `criteria.minRamGb`
- `criteria.requireMacBookPro`
- `criteria.maxLandedCop`
- `criteria.rejectTerms`

Ejemplo generico:

```json
{
  "profile": "iphone-16-pro-max-colombia",
  "queries": ["iPhone 16 Pro Max 256GB"],
  "criteria": {
    "requiredTerms": ["iphone", "16", "pro max"],
    "minRamGb": 0,
    "chips": [],
    "requireMacBookPro": false,
    "rejectUnknownRam": false,
    "minLandedCop": 1000000,
    "maxLandedCop": 6500000,
    "greatDealCop": 5200000,
    "rejectTerms": ["repuestos", "bloqueado", "icloud", "display roto"]
  }
}
```

## Alertas

`.env`:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=
```

Si no configuras alertas externas, imprime en consola y emite beep.

## MercadoLibre

API:

```powershell
npm run mercadolibre:check
```

Sesion de navegador:

```powershell
npm run mercadolibre:browser-login
```

La API puede devolver `403` aunque el token funcione. El modo estable para MercadoLibre es navegador visible con perfil persistente. Patchright visible funciona; headless queda bloqueado por MercadoLibre.

OAuth:

```powershell
npm run mercadolibre:auth-url
npm run mercadolibre:exchange -- CODIGO_DE_LA_REDIRECCION
npm run mercadolibre:refresh
```

## Patchright

```powershell
npm run patchright:check
```

Resultado esperado actual:

```text
patchright_headless_retail > 0
patchright_headless_ml 0
patchright_visible_ml > 0
```

Para activarlo en el flujo normal:

```json
{
  "sources": {
    "patchrightBrowser": {
      "enabled": true
    }
  }
}
```

## Desarrollo

```powershell
npm test
npm run search
```

Reglas practicas:

- No subas `.env`, `config.json` ni `data/`.
- Mantener fuentes nuevas desactivables desde config.
- Preferir HTTP o APIs publicas antes que navegador.
- Si una fuente requiere navegador, bloquear imagenes/media/fuentes.
- No agregar bypass agresivo que ponga en riesgo cuentas reales.

## Contribuir

Lee [CONTRIBUTING.md](./CONTRIBUTING.md).

## Licencia

MIT
