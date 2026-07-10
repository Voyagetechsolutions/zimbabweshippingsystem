# How to give the AI your catalogue

The AI reads the catalogue from the FIRST source it finds:

1. `whatsapp-bot/data/catalogue.json` — structured products. Rename this idea to
   `catalogue.json` and use a list like:
   [
     { "name": "200L Drum", "price": "€360", "category": "Shipping", "description": "Ship a full drum to Zimbabwe" },
     { "name": "Storage Trunk", "price": "€220", "category": "Shipping", "description": "Large storage box" }
   ]

2. `whatsapp-bot/data/catalogue.md` — just paste your product list as text/markdown.
   Create the file and write whatever you'd tell a customer about each product.

3. `CATALOGUE_URL` env var — a public web page listing your products. The bot
   fetches it and reads the text. Note: WhatsApp catalogue links (wa.me/c/...)
   are usually JavaScript-rendered and DON'T scrape well — prefer option 1 or 2,
   or point this at a normal web page (e.g. a products page on your website).

To use: create `catalogue.json` or `catalogue.md` in this folder (or set
CATALOGUE_URL), then ask the bot "what's in your catalogue?".
