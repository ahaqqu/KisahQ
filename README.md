# KisahQ

KisahQ is the public marketing site for [RumaQ](https://rumaq.ahaqqu.com) — the
"Kisah Hemat Ibu Hana" storybook that tells the price-comparison story in a
K-drama page-turn format. It is a sibling project of RumaQ and DokumenQ in the
ahaqqu portfolio.

- **Stack**: Astro (static output, framework-free islands) served by a
  Cloudflare Worker with static assets.
- **Domain**: `kisahq.ahaqqu.com` (Worker custom domain, ahaqqu.com zone).
- **Live data**: EP.3 (promo calendar) and EP.4 (savings fortune-teller) read
  RumaQ's public price endpoints through a same-origin `/data/*` edge-cached
  proxy served by this Worker. The site never calls RumaQ's API directly from
  the browser, so no CORS changes are needed anywhere.
- **Deploy**: `./scripts/deploy.sh cloudflare` (single entrypoint).

## Development

```sh
npm install
npm run dev        # Astro dev server
npm run build      # static build (dist/)
npm test           # unit tests
```

See the repository issues for the phased plan (P1 scaffold → P2 storybook
engine → P3 demo wiring → P4 content → P5 deploy).
