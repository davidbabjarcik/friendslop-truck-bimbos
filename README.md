# Friendslop Truck — Multiplayer 🚚🎯

Low-poly co-op hra pre 2 hráčov cez LAN / Hamachi. Three.js klient + Node.js server.

- **Šofér (hráč 1)** — v sklade nosí škatule, na diaľnici riadi kamión (A/D, ←/→) a trúbi (SPACE = omráči hrozby).
- **Strelec (hráč 2)** — v sklade pomáha nosiť, na diaľnici strieľa hrozby myšou (LMB, myš sa zamkne).

Tri akty: **Sklad** (nalož kamión) → **Diaľnica** (600 m, zver a bandity) → **Garáž** (upgrady: motor, pancier, trúba, sklad).

## Spustenie

### HOST
1. Nainštaluj [Node.js 18+](https://nodejs.org) a Hamachi
2. V Hamachi: Sieť → Vytvoriť novú sieť, daj heslo kamarátovi
3. V tomto priečinku: `npm install` a potom `node server.js`
4. Otvor `client.html` v prehliadači, nechaj `localhost` a klikni Pripojiť
5. Svoju Hamachi IP (25.x.x.x) pošli kamarátovi

### CLIENT
1. Nainštaluj Hamachi, pripoj sa do hostovej siete
2. V `client.html` zmeň `HOST_IP` na Hamachi IP hostu — alebo ju len napíš na úvodnej obrazovke
   (funguje aj `client.html?host=25.x.x.x`)
3. Otvor `client.html` v prehliadači
4. Počkaj na „Pripojený ako Strelec 🎯“

Server beží na porte **3000** (konštanta `PORT` hore v `server.js`). Ak sa kamarát nevie pripojiť,
povoľ Node.js vo Windows Firewalle (aspoň pre súkromné siete / Hamachi).

## Ovládanie

| | Sklad | Diaľnica |
|---|---|---|
| Šofér | WASD / šípky | A/D alebo ←/→ riadenie, SPACE trúba |
| Strelec | WASD / šípky | myš mieri, LMB strieľa, ESC uvoľní myš |

Škatuľu zoberieš, keď k nej prídeš; naložíš ju v žltej zóne pri kamióne.
Ak niekto vypadne, hra sa pozastaví a čaká 10 s na reconnect.

## Súbory
- `server.js` — celá logika hry (server-authoritative, 20 tickov/s), jediná závislosť `ws`
- `client.html` — Three.js r168 klient, bez buildu
