# Contributing

Gracias por aportar. Este proyecto prioriza fuentes configurables, bajo costo local y cambios faciles de validar.

## Antes de abrir un PR

```powershell
npm install
npm test
npm run search
```

No incluyas:

- `.env`
- `config.json`
- `data/`
- tokens, cookies o capturas con secretos

## Como agregar una fuente

Preferencia:

1. API publica o JSON ligero.
2. HTML con `cheerio`.
3. Navegador con Playwright/Patchright solo si la pagina lo exige.

Toda fuente debe:

- Tener `enabled` configurable.
- Devolver `source`, `id`, `title`, `url`, `price`, `currency`, `condition`, `international`.
- Respetar `watch.maxResultsPerSource`.
- No romper todo el flujo si falla.
- Evitar descargar imagenes/media/fuentes cuando use navegador.

## Como agregar un preset

No hardcodees productos en codigo. Agrega o documenta un `config.<producto>.json` con:

- `profile`
- `queries`
- `criteria.requiredTerms`
- `criteria.rejectTerms`
- umbrales de precio
- fuentes necesarias

El preset por defecto puede seguir siendo MacBook, pero el motor debe servir para otros productos.

## Validacion esperada

Incluye en el PR:

- comando ejecutado
- cantidad de resultados o alerta relevante
- fuente afectada
- limitacion conocida si existe

Ejemplo:

```text
npm test -> pass
npm run search -> encontro 2 ofertas de Enjoy VideoGames HTTP y 1 de MercadoLibre CO
```
