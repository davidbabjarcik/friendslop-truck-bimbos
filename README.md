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
4. Otvor `client.html` v prehliadači → **▶ Hrať**, nechaj `localhost` a klikni Pripojiť
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
Menu počas hry: tlačidlo **☰** vpravo dole alebo **Esc** (Pokračovať, Ako hrať, O hre, Odpojiť sa).
Hra v menu beží ďalej — je to multiplayer.

## Súbory
- `server.js` — logika hry (20 tickov/s), jediná závislosť `ws`
- `client.html` — Three.js r168 klient, bez buildu

## Tím
- 💡 Nápad: **mitkos**
- 💻 Kód: **dodo** a **Dejvo**

## Zmeny

### v1.2 — oprava pádu + menu
**Prečo to padalo:** v úprave „pls fixv1“ (plynulý pohyb) sa omylom rozbili dve veci v `client.html`:
1. Funkcia `onPhaseChange` sa ocitla **vnorená sama v sebe** (`function onPhaseChange() { function onPhaseChange() {…}}`).
   Vonkajšia funkcia tak nerobila nič — hra sa nikdy neprepla na diaľnicu. Šofér nevidel cestu, nemohol riadiť
   a po chvíli zrážky zničili náklad → koniec hry.
2. Z `updateDriving` zmizol výpočet vzdialenosti (`disp.dist`) a premenná `tz`. Hneď ako by sa jazda zobrazila,
   každý snímok by spadol na chybe `tz is not defined` a obraz by zamrzol.

**Čo je opravené:**
- `onPhaseChange` je zase jedna funkcia, výpočet vzdialenosti a `tz` je späť.
- Vlastná postavička na začiatku a v každom novom kole začína tam, kde ju postavil server (predtým na (0, 0) alebo tam, kde stála v minulom kole).
- Plynulý pohyb zo „pls fixv1“ ostal (klient posiela svoju pozíciu), ale **server ju preberá max. rýchlosťou chôdze / riadenia**
  (+50 % rezerva na lag) — žiadne teleporty ani podvádzanie. Prijíma len platné čísla (NaN by rozbil celý stav).
- Na začiatku každého kola server zabudne staré pozície z minulého kola.
- Poistky: zlá správa od klienta nezhodí server a chyba v jednom snímku nezastaví hru (vypíše sa do konzoly, F12).
- Otestované: 4 kolá za sebou s botmi + celé kolo v prehliadači.

**Nové:**
- Hlavné menu: **▶ Hrať**, **🎮 Ako hrať**, **ℹ️ O hre** (tím a popis hry).
- Menu počas hry (☰ / Esc) s možnosťou **Odpojiť sa** bez automatického reconnectu.

### v1.1 — „pls fixv1“ (Dominik)
- Plynulý pohyb: vlastnú postavičku v sklade a kamión šoféra počíta klient každý snímok a posiela serveru polohu
  (predtým sa čakalo na server, 20× za sekundu, takže pohyb trhal).

### v1.0
- Prvá verzia: sklad → diaľnica → garáž, 2 hráči cez LAN / Hamachi.
