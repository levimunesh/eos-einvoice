# eos e-invoice

Create, check, read and archive e-invoices in the browser. No server: invoices never leave the device.

| Country | What it produces | Checked against |
|---|---|---|
| Germany | ZUGFeRD / Factur-X PDF, XRechnung 3.0 XML | EN 16931 rules 1.3.16, XRechnung Schematron 2.6.0 (incl. Peppol BIS 3.0.21 rules), CII / UBL schemas |
| France | Factur-X PDF (EN 16931 profile) with the French legal mentions | EN 16931 rules, French BR-FR rules (Flux 2, Schematron 1.4.0.04) |
| Poland | KSeF structured invoice FA(3) XML | Official FA(3) schema 1-0E, plus own checks of sums and NIP check digits |
| Australia | Peppol PINT A-NZ UBL XML | PINT A-NZ rules 1.1.3 (shared and national), UBL 2.1 schema |
| Canada | Invoice PDF with a UBL 2.1 data file inside | UBL 2.1 schema, plus own checks of the CRA information requirements (guide RC4022). Canada has no official e-invoice format. |

Four work areas: **Convert** (PDF, Word or Excel invoice to e-invoice), **Validate** (official rules, explained in plain language), **Receive** (show an incoming e-invoice as a readable invoice), **Archive** (original file, checksum, keep-until date per country).

What this tool does not do: it does not send invoices. France needs an approved platform, Poland needs KSeF, Australia needs a Peppol access point.

## Build

```
npm ci --omit=dev
npm run build        # writes dist/
```

`dist/` is a static site. `vercel.json` runs exactly these commands.

## Layout

- `src/` application code (plain ES modules). `src/countries.js` holds everything that differs per country.
- `build/rules/` the official rule sets, converted to lookup tables (`tools/sch2json.mjs`, `tools/xsd2json.py`, `tools/xsd2model.py`). Regenerating them needs the official rule files, which are not in this repository.
- `vendor/fontoxpath-eos.js` the XPath engine (fontoxpath 3.34.0, MIT) built with a patch that keeps decimal arithmetic exact.
- `test/` and `tools/` tests and comparison tools. Several compare against the official stylesheets on Saxon and against XSD validation, and expect those files at paths outside this repository.
- `NOTICES.txt` third-party components and rule-set licences. The EN 16931 and French rule sets are under the EUPL.

## Status

Working prototype. Not tax advice. The PDF/A-3 structure of generated PDFs has not been checked with veraPDF.
