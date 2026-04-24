# MacBook Deal Watch

Busca MacBook Pro M4/M5 nuevas o usadas con minimo 18 GB de RAM y estima costo puesto en Colombia.

```powershell
npm install
npm run browser:install
Copy-Item config.example.json config.json
npm run search
npm run watch
```

Alertas opcionales:

```powershell
Copy-Item .env.example .env
# TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
# o DISCORD_WEBHOOK_URL
```

Fuentes incluidas:

- MercadoLibre Colombia API si tu red/token tiene acceso.
- eBay por navegador con costo de importacion estimado.
- Enjoy VideoGames, EasyMac y Tecnoplaza por navegador.
- iShop Colombia y Mac Center por buscador Shopify.
- Alkosto, Ktronix y Falabella Colombia por navegador.
- Bloqueo de imagenes, fuentes, media y trackers en navegador para acelerar carga.
- Patchright separado y desactivado por defecto.
- HTML configurable en `config.json` para tiendas con buscador publico.

MercadoLibre:

```powershell
npm run mercadolibre:check
```

Si la API responde `mercadolibre_403_token_required`, agrega `MERCADOLIBRE_ACCESS_TOKEN` en `.env`.
Si el navegador responde `Hubo un error accediendo`, MercadoLibre bloqueo esa sesion/red; prueba con `sources.browser.headless=false` y habilita la fuente `MercadoLibre CO` en `config.json`.

Para MercadoLibre por navegador con sesion real:

```powershell
npm run mercadolibre:browser-login
```

Luego en `config.json`, habilita `sources.browser.sources` -> `MercadoLibre CO` y usa `headless=false` si el sitio vuelve a bloquear.

Token MercadoLibre:

```powershell
npm run mercadolibre:auth-url
npm run mercadolibre:exchange -- CODIGO_DE_LA_REDIRECCION
npm run mercadolibre:refresh
```

Paquete MCP externo:

```powershell
npm run mercadolibre:mcp-check
```

La fuente `mercadolibreMcp` usa `@dan1d/mercadolibre-mcp` aparte de la fuente API propia y del navegador.

Patchright:

```powershell
npm run patchright:check
```

Para activarlo en el flujo normal, habilita `sources.patchrightBrowser.enabled=true` en `config.json`.

VestAuth no es para scraping ni busqueda de ofertas. Sirve para dar identidad criptografica a agentes/bots y verificar requests HTTP firmadas en APIs propias. En este proyecto podria usarse despues si expones un endpoint privado para que solo tu agente envie alertas o ejecute acciones autenticadas.
