# Deal Watch Colombia

Watcher configurable para encontrar ofertas reales en tiendas y marketplaces usados desde Colombia. El preset por defecto compara MacBook y productos similares por precio; los filtros estrictos de chip/RAM/modelo se activan con `--strict-specs`.

Nombre sugerido para el repo publico:

```text
deal-watch-colombia
```

## Que hace

- Busca productos en varias fuentes.
- Estima costo puesto en Colombia para compras internacionales.
- Filtra por precio maximo, precio minimo sospechoso, chip, palabras requeridas y palabras rechazadas.
- Guarda RAM/chip detectados cuando aparecen, pero el preset Mac compara productos similares sin descartar por specs.
- Guarda vistos en `data/seen.json` para alertar solo novedades en modo `watch`.
- Alerta por consola, Telegram o Discord.
- Exporta JSON/TXT para analizar con IA.
- Bloquea CSS, imagenes, fuentes, media, service workers y trackers en navegador para cargar mas rapido.

## Fuentes

- MercadoLibre Colombia por Patchright con sesion persistente.
- MercadoLibre API y `@dan1d/mercadolibre-mcp` como fuentes separadas de diagnostico.
- eBay por navegador, con importacion estimada.
- Enjoy VideoGames, EasyMac y Tecnoplaza por HTTP.
- iShop Colombia, Mac Center, Tech Street Colombia, Celudmovil y Musical Boutique por Shopify Suggest API.
- Alkosto, Ktronix y Alkomprar por Algolia directo, sin cargar navegador.
- Exito y FC Tech por API VTEX.
- Compudemano, Enjoy VideoGames, EasyMac, MacPlanet, Pladani, Conectamos, Tienda Sales TS, ThaniaCel, Megatienda Virtual 77, Tienda Tek, Tecnoprocesos, iTech Colombia, TiendaTech Colombia, TeCo Market y DH Store por WooCommerce Store API.
- Colombian Mac Store por JSON-LD para usados con precio.
- Apple Store Colombia, MacPlanet, Compudemano, Tienda Tek y Tecnoprocesos por HTTP.
- Falabella Colombia por Patchright.
- iTech Colombia y TiendaTech Colombia por HTTP.
- Patchright es el motor de navegador por defecto.

## Instalacion

```powershell
npm install
npm run browser:install
Copy-Item config.example.json config.json
Copy-Item .env.example .env
```

Patchright:

```powershell
npm run patchright:install
npm run patchright:check
```

## Uso

```powershell
npm run search
npm run watch
```

`search` sin flags abre un modo guiado:

```text
Busqueda [macbook-pro-m4-m5-colombia]:
Precio maximo puesto COP [13.000.000]:
Exportar para IA [txt/json/all/none] [txt]:
```

Enter usa el preset por defecto. Si escribes otra busqueda, por ejemplo `MAC-MINI`, el CLI cambia tambien los terminos obligatorios y las queries internas de las fuentes para no seguir filtrando MacBook Pro. El precio acepta `13000000`, `13.000.000`, `13m` o `8.5m`.

CLI directo:

```powershell
npx deal-watch-colombia search
npx deal-watch-colombia watch --interval-minutes 30
```

Overrides rapidos:

```powershell
node src/cli.js search --query "MacBook Pro M5 24GB" --max-landed-cop 8500000
node src/cli.js search --strict-specs
node src/cli.js search --loose-specs --required-term macbook
node src/cli.js search --guided
node src/cli.js search --no-interactive
node src/cli.js search --export txt
node src/cli.js search --export json,txt --output-dir data/exports
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
    "requiredTerms": ["macbook"],
    "minRamGb": 0,
    "preferredMinRamGb": 18,
    "chips": [],
    "requireMacBookPro": false,
    "rejectUnknownRam": false,
    "minLandedCop": 4500000,
    "maxLandedCop": 13000000,
    "greatDealCop": 8500000
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

Para filtrar duro MacBook Pro M4/M5 con minimo 18 GB:

```powershell
node src/cli.js search --strict-specs
```

Para comparar similares sin rigidez de specs:

```powershell
node src/cli.js search --loose-specs --required-term macbook
```

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

## Exportacion

```powershell
node src/cli.js search --export txt
node src/cli.js search --export json,txt
node src/cli.js search --export all --output-dir data/exports
```

El TXT queda listo para pegarlo en una IA y pedir comparacion por precio, riesgo, RAM, estado, tienda y costo puesto.

## MercadoLibre

API:

```powershell
npm run mercadolibre:check
```

Sesion de navegador:

```powershell
npm run mercadolibre:browser-login
```

La API puede devolver `403` aunque el token funcione. El modo estable para MercadoLibre es Patchright visible con perfil persistente. Headless puede quedar bloqueado por MercadoLibre.

OAuth:

```powershell
npm run mercadolibre:auth-url
npm run mercadolibre:exchange -- CODIGO_DE_LA_REDIRECCION
npm run mercadolibre:refresh
```

## Patchright

Todas las fuentes de navegador usan Patchright. La seccion `patchrightBrowser` queda como flujo separado de diagnostico/comparacion, pero el flujo normal `browser` tambien corre sobre Patchright.
Si un flujo necesita navegador visible, `startMinimized: true` evita que la ventana quede al frente.

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
- Si una fuente requiere navegador, bloquear CSS/imagenes/media/fuentes/service workers.
- No agregar bypass agresivo que ponga en riesgo cuentas reales.

## Contribuir

Lee [CONTRIBUTING.md](./CONTRIBUTING.md).

## Licencia

MIT
