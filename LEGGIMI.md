# Sito "Conquista d'Italia" (mappa 3D)

Sito statico: `index.html`, `app.js`, `style.css`, `logo.png` + tre file di dati:
- `italia.json`: confini delle regioni (ISTAT) e dei paesi vicini, creato da `engine/build_geo.py`
- `data.json`: città, classifiche, feed, conquiste della notte, scritto da `engine/engine.py`
- `houses.json`: tutte le case (@utente, città, ruolo, posizione), scritto da `engine/engine.py`

Three.js viene caricato da cdn.jsdelivr.net (versione 0.160.0). Non serve nessun server.

## Regole (nel motore)
- ogni commento con un comune = una casa ("Bari" oppure "Santeramo in Colle, Puglia")
- ogni @amico taggato (max 2) = un'altra casa nello stesso comune
- il primo del comune è il Fondatore (tetto d'oro), chi porta più case è il Generale
- alle 21 (`engine.py --conquista`) le città più grandi invadono le vicine: ognuna prende il territorio
  confinante più debole di una città più piccola (un territorio cambia padrone al massimo una volta per sera)

## Aggiornare i dati
```
python3 engine/engine.py --demo --reset     # dati di prova
python3 engine/engine.py                    # commenti veri (IG_TOKEN e IG_USER_ID)
python3 engine/engine.py --conquista        # turno delle 21
```
Su GitHub lo fa da solo `.github/workflows/aggiorna.yml` ogni 15 minuti e alle 21.

## Provarlo in locale
```
cd site && python3 -m http.server 8000      # poi apri http://localhost:8000
```

## Da sapere
- Link diretto a una casa o a una città: `…/?cerca=Santeramo` oppure `…/?cerca=@nome`
- Il profilo Instagram del pulsante "Apri Instagram" è in cima ad `app.js` (costante `INSTAGRAM`)
- Il modulo "Il tuo negozio sulla mappa" salva le richieste solo se il sito è su **Netlify** (Netlify Forms,
  gratis fino a 100 invii al mese): le trovi in Netlify > Forms. Su GitHub Pages il modulo non salva nulla.
  Il pagamento (es. Stripe Payment Link) non è ancora collegato: nessun prezzo è inventato.
