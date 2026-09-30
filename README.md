# Pannon Transfer – Outlook naptár

A diszpécser központ naptára Outlook (mobil) stílusban. Ugyanazt az adatbázist és ugyanazokat a
`staff_users` fiókokat használja, mint a diszpécser felület, így a foglalások, sofőrök és járművek
itt is ugyanazok.

## Mit tud

- **Naptár (főoldal `/`)** – Outlook-szerű felület:
  - Ügyrend (agenda), Nap, 3 nap, Hét és Hónap nézet; mobilon lehúzható heti/havi sáv, swipe lapozás.
  - Utak partnerenként színezve; függő / módosított utak csíkozva, lemondott utak áthúzva.
  - „Most" és „Kezdés X ó Y p múlva" jelzők, aktuális idő vonala.
  - Esemény lap: útvonal (Maps link), utas (hívás link), partner, ár, megjegyzés.
  - Sofőr és jármű kiosztása / átosztása / visszavonása, lemondás.
  - Szabadság és egyéb események felvétele (`calendar_events` kollekció).
  - Keresés utasra, foglalási kódra, sofőrre, járműre, címre; szűrők (partner, sofőr, lemondottak, sofőr nélküliek).
  - Új függő foglalás esetén értesítő jelzés; 30 mp-enként automatikus frissítés.
- **Foglalások, Sofőrök, Járművek** – a diszpécser felületről átvett oldalak (`/bookings`, `/drivers`, `/vehicles`).
- Asztali gépen (≥ 1024 px) oldalsáv mini naptárral és szűrőkkel.

## Belépés

- Foglalási központos diszpécserek és adminok a `/login` oldalon a saját fiókjukkal lépnek be.
- **Személyes link (pl. Renáta):** `https://<domain>/login?token=<személyes token>` – megnyitáskor
  jelszó nélkül azonnal a naptárra visz, a munkamenet 30 napig érvényes. A link megnyitása után a
  telefon böngészőjében „Hozzáadás a kezdőképernyőhöz" paranccsal alkalmazásként is telepíthető.
- Új link generálása (a régit érvényteleníti, mert a `staff_users` gyűjtemény közös a diszpécser felülettel):

  ```bash
  node --env-file=.env.local scripts/create-direct-link.mjs tripa.renata@pannonguard.hu https://<domain>          # próba, nem ír
  node --env-file=.env.local scripts/create-direct-link.mjs tripa.renata@pannonguard.hu https://<domain> --confirm # ténylegesen létrehozza
  ```

## Beállítás

```bash
cp .env.example .env.local   # majd töltsd ki
npm install
npm run dev                  # fejlesztés
npm run build && npm start   # éles
```

Környezeti változók: lásd `.env.example` (`MONGODB_URI`, `MONGODB_DB`, `OUTLOOK_COOKIE_SECRET`,
e-mail beállítások, `PARTNER_PORTAL_URL`). Éles környezetben az `OUTLOOK_COOKIE_SECRET` kötelező.

## Megjegyzések

- Az út időtartama becsült (légvonal × 1,25 / 95 km/h + 10 perc), mert a foglalásokban nincs érkezési idő.
- A `lib/`, `app/api/` és a `bookings`, `drivers`, `vehicles`, `login` oldalak a diszpécser projektből
  származnak; az Outlook-stílusú UI a `app/components/calendar/` alatt van.
