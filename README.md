<p align="center">
  <img src="assets/logo.svg" alt="Friendslop Truck" width="760">
</p>

<p align="center">
  <b>Low-poly co-op hra pre dvoch kamarátov.</b><br>
  Jeden šoféruje kamión, druhý ho strieľaním bráni na diaľnici plnej zveri a banditov.
</p>

<p align="center">
  <img alt="Hráči: 2" src="https://img.shields.io/badge/hr%C3%A1%C4%8Di-2-FF6B35?style=for-the-badge">
  <img alt="LAN / Hamachi" src="https://img.shields.io/badge/LAN-Hamachi-FFD700?style=for-the-badge&labelColor=1A1A2E">
  <img alt="Node.js 18+" src="https://img.shields.io/badge/Node.js-18%2B-7CB87A?style=for-the-badge&logo=nodedotjs&logoColor=white">
  <img alt="Three.js r168" src="https://img.shields.io/badge/Three.js-r168-4FC3F7?style=for-the-badge&logo=threedotjs&logoColor=white">
</p>

<p align="center">
  <a href="#-spustenie">Spustenie</a> ·
  <a href="#-ovládanie">Ovládanie</a> ·
  <a href="#-ako-sa-hrá">Ako sa hrá</a> ·
  <a href="#-tím">Tím</a> ·
  <a href="#-zmeny">Zmeny</a>
</p>

<p align="center">
  <img src="assets/screenshots/highway.jpg" alt="Jazda po diaľnici" width="760">
</p>

---

## 🎮 O hre

**Friendslop Truck** je kooperatívna hra pre 2 hráčov cez LAN alebo Hamachi. Grafika je zámerne naivná:
plochý low-poly štýl, žiadne textúry, výrazné farby.

| Rola | Kto | Čo robí |
|---|---|---|
| 🚚 **Šofér** | prvý pripojený hráč | nosí škatule, riadi kamión, trúbi a nakupuje upgrady |
| 🎯 **Strelec** | druhý pripojený hráč | pomáha nosiť škatule a myšou strieľa hrozby na ceste |

<table>
  <tr>
    <td width="50%"><img src="assets/screenshots/warehouse.jpg" alt="Sklad"><p align="center"><b>1 · Sklad</b> — naložte kamión</p></td>
    <td width="50%"><img src="assets/screenshots/garage.jpg" alt="Garáž"><p align="center"><b>3 · Garáž</b> — kúpte upgrady</p></td>
  </tr>
</table>

## 🚀 Spustenie

Netreba nič buildovať: stačí Node.js na serveri a prehliadač.

### 🖥️ Host (spúšťa server)

1. Nainštaluj [Node.js 18+](https://nodejs.org) a [Hamachi](https://vpn.net)
2. V Hamachi: **Sieť → Vytvoriť novú sieť**, daj meno a heslo kamarátovi
3. V priečinku hry spusti:
   ```bash
   npm install
   node server.js
   ```
4. Otvor `client.html` v prehliadači → **▶ Hrať** → nechaj `localhost` → **Pripojiť**
5. Svoju Hamachi IP (`25.x.x.x`, vidíš ju hore v Hamachi) pošli kamarátovi

### 🎧 Kamarát (pripája sa)

1. Nainštaluj Hamachi a pripoj sa do hostovej siete
2. Otvor `client.html` → **▶ Hrať** → napíš Hamachi IP hosta → **Pripojiť**
3. Počkaj na „Pripojený ako Strelec 🎯“ a hra sa spustí sama

> [!TIP]
> IP sa dá zadať aj natrvalo v `client.html` (konštanta `HOST_IP`) alebo v adrese: `client.html?host=25.x.x.x`.

> [!NOTE]
> Server beží na porte **3000** (`PORT` hore v `server.js`). Ak sa kamarát nevie pripojiť, povoľ Node.js
> vo **Windows Firewalle** (aspoň pre súkromné siete).

> [!WARNING]
> **Neklikaj do čierneho okna so serverom.** Keď v ňom Windows označí text, celý server sa zastaví a obom hráčom
> to zamrzne, kým nestlačíš `Esc` alebo `Enter`.

### 📶 Ping a lag

Ping vidíš v hre vpravo hore (📶) a ping kamaráta vľavo hore. Zelená je < 100 ms, žltá < 250 ms, červená je viac.
Server každých 5 s vypíše do konzoly, ako to ide:

```
[net] P1 ping 1 ms · 16 tick/s · 6.4 KB/s  |  P2 ping 157 ms · 12 tick/s · 4.8 KB/s
```

Keď má niekto pomalé spojenie, server mu automaticky posiela stav menej často (najmenej 5× za sekundu), aby sa
dáta nehromadili. Ak má kamarát v Hamachi pri tvojom mene **žltú/modrú bodku** namiesto zelenej, spojenie ide cez
Hamachi relay. Ten býva pomalý, takže pomôže reštart Hamachi alebo povolenie Hamachi vo firewalle.

## ⌨️ Ovládanie

| | 📦 Sklad | 🛣️ Diaľnica |
|---|---|---|
| 🚚 **Šofér** | `WASD` / šípky | `A` `D` alebo `←` `→` riadenie · `SPACE` trúba |
| 🎯 **Strelec** | `WASD` / šípky | myš mieri · ľavé tlačidlo strieľa · `Esc` uvoľní myš |
| **Obaja** | `Esc` / ☰ menu | `Esc` / ☰ menu |

## 🗺️ Ako sa hrá

1. **📦 Sklad** — škatule ležia na regáloch. Prídeš k nim a zoberú sa samé. Odnes ich do **žltej zóny** pri kamióne.
   Keď je naložené všetko, vyráža sa.
2. **🛣️ Diaľnica** — 600 m do cieľa. Cez cestu skáče **zver** a z krajnice sa vrhajú **bandity**.
   Každý náraz zničí časť nákladu. Keď je náklad na nule, je koniec hry.
   > Šofér zatrúbi → hrozby v dosahu sa zastavia → strelec ich ľahko trafí. Spolupráca je všetko.
3. **🛒 Garáž** — za doručený náklad dostanete 💰. Šofér kupuje upgrady a spustí ďalšiu jazdu.

| Upgrade | Čo robí (za level, max 3) |
|---|---|
| ⚙️ Motor | +4 rýchlosť, nižšia spotreba |
| 🛡️ Pancier | −20 % poškodenia nákladu |
| 📯 Trúba | väčší dosah, dlhší stun, rýchlejšie strieľanie |
| 📦 Sklad | +2 škatule na jazdu = viac peňazí |

Ceny: 💰100 → 💰200 → 💰350. Ak niekto vypadne, hra sa pozastaví a **10 s** čaká, kým sa vráti.

## 👥 Tím

| | |
|---|---|
| 💡 **Nápad** | **mitkos** |
| 💻 **Kód** | **dodo** a **Dejvo** |

## 🎨 Logo

<img src="assets/logo-1000.png" alt="Friendslop Truck — štvorcové logo" width="220" align="right">

- [`assets/logo-1000.png`](assets/logo-1000.png) — štvorcové 1000×1000 (profilovka, Discord, ikona)
- [`assets/logo-square.svg`](assets/logo-square.svg) — to isté vektorovo (ľubovoľná veľkosť)
- [`assets/logo.svg`](assets/logo.svg) — široký banner
- [`assets/icon.svg`](assets/icon.svg) — malá ikona (karta prehliadača)

<br clear="right">

## 🧩 Ako to funguje

```
 client.html (Šofér)  ──input──▶                 ◀──input──  client.html (Strelec)
                                  server.js
                      ◀──stav──  5–20× za sek.   ──stav──▶
                                (podľa pingu)
```

- **`server.js`** — Node.js + [`ws`](https://github.com/websockets/ws). Rozhoduje o všetkom: hrozby, zásahy, náklad, peniaze.
  Klienti posielajú len input a svoju polohu. Server ju preberá najviac rýchlosťou chôdze, takže sa nedá teleportovať.
  Každých 0,5 s meria ping každého hráča a podľa neho mu posiela stav 5–20× za sekundu.
- **`client.html`** — jeden súbor, [Three.js](https://threejs.org) r168 z CDN. Vykresľuje hru, vlastný pohyb počíta
  plynulo každý snímok.

## 📝 Zmeny

<details open>
<summary><b>v1.3</b> — oprava 5000 ms lagu cez Hamachi</summary>

**Prečo mali obaja hráči ~5000 ms:** boli to tri veci naraz.

1. **Server posielal stav naslepo.** Keď pomalé spojenie (Hamachi relay) nestíhalo, dáta sa hromadili vo fronte
   a každá ďalšia správa prišla ešte neskôr. Oneskorenie rástlo každú sekundu, až kým server hráča neodpojil.
   Zmerané so simulovaným pomalým spojením (10 KB/s): **0,7 s → 1,8 s → 3 s → 4,2 s → 5,8 s → odpojenie**.
   Zníženie na 10 tickov/s (v1.1.x) to len spomalilo, fronta rástla aj tak.
2. **V `client.html` chýbal `let lastSentInput`** (zmazal sa pri obmedzení posielania inputu). Hneď po pripojení
   každý snímok spadol na `lastSentInput is not defined`: obraz zamrzol a pohyb sa neposielal. Vyzeralo to ako obrovský lag.
3. **Zo servera zmizol `ws.on('error')`.** Jedna sieťová chyba (napr. vypadnutý Hamachi) by zhodila celý server.

**Opravené:**
- Server meria **ping** každého hráča (každých 0,5 s). Keď stúpne nad 250 ms, posiela mu stav menej často
  (20 → 10 → 7 → 5× za sekundu); keď klesne, zase častejšie. Keď sa neodoslané dáta hromadia, tick vynechá.
  Udalosti (zásahy, zvuky) sa pritom nestratia, prídu v ďalšom ticku.
  Na tom istom pomalom spojení je teraz oneskorenie **0,1–0,3 s stabilne** (90 s test, sklad aj jazda).
- **Menšie dáta:** hrozby, škatule a hráči idú ako polia, peniaze a upgrady len keď sa zmenia (jeden tick má ~0,4 KB namiesto ~0,8 KB).
- **Ping v hre:** 📶 vpravo hore (tvoj) a vľavo hore (kamaráta). Server ho každých 5 s vypíše do konzoly.
- Vrátené `let lastSentInput`, `ws.on('error')`, `wss.on('error')` a výpis IP adries pri štarte (aj Hamachi 25.x.x.x).
- Server zase simuluje 20× za sekundu. Limit `MAX_DT` je 0,1: Windows časovač beží len ~16×/s a s limitom 0,05
  by hra na serveri išla na 80 % rýchlosti a klient by ju stále dobiehal (trhanie).
- Input sa posiela max. 20× za sekundu (bolo 10×) a len keď sa zmení.
- Ponechané z Dominikových úprav: škatule sa posielajú len v sklade, plynulejší pohyb druhého hráča, 2 desatinné miesta.
</details>

<details>
<summary><b>v1.2</b> — oprava pádu, menu, logo</summary>

**Prečo hra padala:** v úprave „pls fixv1“ sa v `client.html` omylom rozbili dve veci:

1. Funkcia `onPhaseChange` sa ocitla **vnorená sama v sebe**. Vonkajšia funkcia nerobila nič, takže hra sa nikdy
   neprepla na diaľnicu: šofér nevidel cestu, nemohol riadiť a po chvíli zrážky zničili náklad → koniec hry.
2. Z `updateDriving` zmizol výpočet vzdialenosti a premenná `tz`. Keby sa jazda zobrazila,
   každý snímok by spadol na `tz is not defined` a obraz by zamrzol.

**Opravené:**
- `onPhaseChange` je zase jedna funkcia; výpočet vzdialenosti a `tz` je späť.
- Vlastná postavička začína tam, kam ju postaví server, aj v každom novom kole.
- Plynulý pohyb zo „pls fixv1“ ostal, ale server preberá polohu najviac rýchlosťou chôdze/riadenia
  (+50 % rezerva na lag), berie len platné čísla a na začiatku kola zabudne staré polohy.
- Poistky: zlá správa nezhodí server, chyba v jednom snímku nezastaví hru (vypíše sa do konzoly, `F12`).
- Otestované: 4 kolá za sebou s botmi + celé kolo v prehliadači.

**Nové:**
- Hlavné menu: **▶ Hrať**, **🎮 Ako hrať**, **ℹ️ O hre**.
- Menu počas hry (☰ / `Esc`) s možnosťou **Odpojiť sa**.
- Logo, ikona v karte prehliadača a toto README.

<p align="center"><img src="assets/screenshots/menu.jpg" alt="Hlavné menu" width="560"></p>
</details>

<details>
<summary><b>v1.1</b> — „pls fixv1“ (Dominik)</summary>

- Plynulý pohyb: vlastnú postavičku v sklade a kamión šoféra počíta klient každý snímok a posiela serveru polohu.
  Predtým sa čakalo na server (20× za sekundu), takže pohyb trhal.
</details>

<details>
<summary><b>v1.0</b> — prvá verzia</summary>

- Sklad → diaľnica → garáž, 2 hráči cez LAN / Hamachi.
</details>

---

<p align="center"><sub>Vyrobené s 🧡 · nápad mitkos · kód dodo &amp; Dejvo</sub></p>
