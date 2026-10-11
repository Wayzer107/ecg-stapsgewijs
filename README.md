# ECG Stapsgewijs

Webapp om een ECG systematisch te beoordelen, bedoeld voor de klinische praktijk (ANIOS, AIOS, coassistenten).

**Live:** https://wayzer107.github.io/ecg-stapsgewijs/

## Stappen

1. Instellingen: papiersnelheid, ijking, geslacht
2. Ritme: regelmaat, atriale activiteit, P–QRS-relatie, met een ritmesuggestie
3. Frequentie: direct, grote of kleine hokjes, of de strook van 10 s
4. As: kwadrantmethode, iso-elektrische afleiding, netto amplitude of direct op het wiel (met optionele Cabrera-weergave)
5. P-top & PQ: duur, amplitude, AV-geleiding, deltagolf
6. QRS-complex: duur, morfologie, hemiblok, R-topprogressie, Q-golven, LVH (Sokolow–Lyon, Cornell)
7. ST-segment: per afleiding, gegroepeerd per gebied, met patroonherkenning
8. T-top: negatief, afgevlakt of spits per afleiding, U-golven
9. QT-tijd: QTc volgens Bazett, Fridericia, Framingham en Hodges
10. Conclusie: bevindingen, differentiaaldiagnose en een verslag om te kopiëren

## Technisch

- Statische site zonder build-stap: `index.html`, `app.js`, `styles.css`.
- [Preact](https://preactjs.com) + [htm](https://github.com/developit/htm) staan lokaal in `vendor/` (MIT-licentie).
- Werkt op telefoon, tablet (liggend) en desktop, kan worden geïnstalleerd als app (manifest) en werkt daarna offline (service worker).
- Er worden geen gegevens opgeslagen of verstuurd; alles blijft in de browser.

Lokaal draaien: `python -m http.server` in deze map en open http://localhost:8000.
