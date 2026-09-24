# AD-Consult Claimsimulator

**Educatieve oefenomgeving voor functieduiding en resterende verdiencapaciteit**

> Deze educatieve simulator is ontwikkeld door AD-Consult en is niet afkomstig van, gekoppeld aan of goedgekeurd door UWV. De cliëntgegevens, functies, functiecodes en uitkomsten zijn fictief. De simulator vereenvoudigt onderdelen van het arbeidsdeskundige beoordelingsproces en mag niet worden gebruikt voor een formele claimbeoordeling of individueel juridisch advies. Zie [DISCLAIMER.md](DISCLAIMER.md).

## Inhoud

1. [Doel](#doel)
2. [Afbakening](#afbakening)
3. [Techniek](#techniek)
4. [Installatie](#installatie)
5. [Starten](#starten)
6. [Tests](#tests)
7. [Productiebuild](#productiebuild)
8. [Opbouw van de applicatie](#opbouw-van-de-applicatie)
9. [Datastructuur](#datastructuur)
10. [Functies toevoegen](#functies-toevoegen)
11. [Casussen toevoegen](#casussen-toevoegen)
12. [Rekenregels aanpassen](#rekenregels-aanpassen)
13. [Docentmodus](#docentmodus)
14. [Opslag, export en privacy](#opslag-export-en-privacy)
15. [Beperkingen van v1](#beperkingen-van-v1)
16. [Voorstellen voor v2](#voorstellen-voor-v2)

## Doel

De Claimsimulator laat (aankomende) arbeidsdeskundigen in een veilige, fictieve omgeving oefenen met de denkstappen van functieduiding:

- een cliëntbeeld en een vereenvoudigd belastbaarheidsprofiel lezen;
- begrijpen hoe een transparante voorselectie werkt en waarom een signalering nog geen oordeel is;
- functies beoordelen met een verplichte, inhoudelijke motivering;
- een eindselectie samenstellen die aan formele voorwaarden voldoet;
- de resterende verdiencapaciteit en een indicatief arbeidsongeschiktheidspercentage berekenen en de eigen berekening controleren;
- het eigen werk vergelijken met een antwoordmodel en reflecteren.

De deelnemer doorloopt negen stappen; de docent heeft een aparte modus met het antwoordmodel, een controleberekening en beheerinformatie.

## Afbakening

- **Fictief.** Eén trainingscasus (Sam de Vries) en vijftien trainingsfuncties met codes `TRN-001` t/m `TRN-015`. Geen echte functiecodes, geen UWV-schermen, -logo's of -documenten.
- **Vereenvoudigd.** De FML-structuur is teruggebracht tot zestien beoordelingspunten in zes rubrieken. De berekening gebruikt een vast maatmanuurloon en het middelste uurloon van drie functies.
- **Lokaal.** Er is geen server, database, login of externe API. Alle data is JSON in de repository; de voortgang staat in de browser (`localStorage`).
- **Onderwijs.** Uitkomsten zijn "indicatieve uitkomsten van de oefencasus" en hebben geen formele status. De docentmodus is beveiligd met hooguit een optionele drempelcode, geen echte autorisatie.

## Techniek

| Onderdeel | Keuze |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Taal | TypeScript in strikte modus |
| Styling | Tailwind CSS 4 met eigen ontwerptokens (`src/app/globals.css`) |
| Lettertypen | Poppins (koppen, knoppen) en Inter (lopende tekst), zelfgehost via `@fontsource` — geen externe fontservers |
| Data | Lokale JSON in `src/data`, gevalideerd bij het laden |
| Voortgang | `localStorage`, sleutel `adc-claimsimulator:sessie:<casus-id>` |
| Tests | Vitest 5, jsdom, Testing Library |
| Kwaliteit | ESLint 9 (`eslint-config-next`), `tsc --noEmit` |

De architectuur scheidt strikt drie lagen:

- **Data** — `src/data/*.json` en de loader `src/data/index.ts` (validatie, opzoekfuncties).
- **Regels** — `src/lib/*.ts`: types, rekenregels en teksten (`regels.ts`), vergelijking (`vergelijking.ts`), voorselectie (`voorselectie.ts`), berekening (`berekening.ts`), sessie-reducer (`sessie.ts`), eindselectie-validatie (`eindselectie.ts`), evaluatie tegen het antwoordmodel (`evaluatie.ts`), lokale opslag (`opslag.ts`). Deze laag heeft geen React-afhankelijkheid en is volledig testbaar.
- **UI** — `src/app` (routes) en `src/components` (stappen, functiebeoordeling, berekening, docentmodus, herbruikbare bouwstenen in `components/ui`).

## Installatie

Vereist: Node.js 20.9 of hoger (ontwikkeld en getest met Node 22) en npm.

```bash
npm install
```

Optioneel: kopieer `.env.example` naar `.env.local` en vul `NEXT_PUBLIC_DOCENT_CODE` in om de docentmodus achter een toegangscode te zetten (zie [Docentmodus](#docentmodus)).

## Starten

```bash
npm run dev
```

Open <http://localhost:3000>. Routes:

| Route | Inhoud |
| --- | --- |
| `/` | Startpagina met de casus, disclaimer en link om te hervatten |
| `/casus/sam-de-vries/stap/1` … `/stap/9` | De negen stappen van de deelnemersroute |
| `/casus/sam-de-vries/functie/TRN-002` | Functiedetail: vergelijking met het profiel en het beoordelingsformulier |
| `/docent` | Docentmodus |

## Tests

```bash
npm test          # eenmalig
npm run test:watch
npm run check     # lint + typecheck + tests
```

De testset (47 tests in zes bestanden) dekt onder meer:

- **Berekening** (`src/lib/__tests__/berekening.test.ts`): sortering en middelste loon (ook stabiel bij gelijke lonen), resterende verdiencapaciteit, loonverlies en AO-percentage zonder tussentijdse afronding, afronding uitsluitend in de presentatie, rekenen in centen tegen zwevendekommafouten, loonverlies nul en nooit een negatief percentage als het resterende loon boven het maatmanloon ligt, weigering bij minder of meer dan drie functies, klasse-indeling, controle van de eigen berekening met Nederlandse notatie.
- **Voorselectie en vergelijking** (`voorselectie.test.ts`): uitsluiting op opleidingsniveau, opleidingsrichting, vaardigheid, uitsluitend nachtdienst, arbeidsduur en evidente overschrijding; incidentele nachtdienst wordt gesignaleerd maar niet uitgesloten; iedere uitsluiting heeft een uitleg; groen/oranje/rood voor numerieke en ordinale punten; werktijden worden meegenomen.
- **Eindselectie** (`eindselectie.test.ts`): precies drie functies, minimaal drie arbeidsplaatsen, geen uitgesloten of niet-geschikt beoordeelde functies, geen functie zonder geldige motivering.
- **Data** (`data.test.ts`): minimaal twaalf functies met TRN-codes, minimaal drie dragende functies, duidelijke foutmeldingen bij datafouten.
- **Integratie van de deelnemersroute** (`deelnemersroute.integratie.test.ts`): de complete casus via de sessie-reducer — disclaimer, voorselectie, negen beoordelingen, een ongeldige en een geldige eindselectie, berekening (32,14 %), eigen controle, reflectie en evaluatie tegen het antwoordmodel.
- **Interface** (`src/components/__tests__/deelnemersroute.ui.test.tsx`): stap 1 blokkeert "volgende" tot het akkoord, stap 2 is geblokkeerd zonder akkoord, herstel uit de lokale opslag, het beoordelingsformulier vereist een motivering, stap 7 weigert te weinig arbeidsplaatsen, stap 8 controleert de eigen berekening en toont geen uitkomst bij een ongeldige selectie.

## Productiebuild

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

De build rendert alle stappen en functiedetailpagina's vooraf als statische HTML (`generateStaticParams`). Een nieuwe casus of functie in de JSON-bestanden krijgt na `npm run build` automatisch een route.

## Opbouw van de applicatie

De deelnemersroute (`src/components/stappen/`):

| Stap | Component | Inhoud |
| --- | --- | --- |
| 1 | `Stap1Introductie` | Prominente disclaimer, spelregels, optionele naam, verplicht akkoord (blokkeert de overige stappen) |
| 2 | `Stap2Clientbeeld` | Fictieve cliëntgegevens, opleiding, ervaring, vaardigheden, situatieschets zonder medische gegevens |
| 3 | `Stap3Maatman` | Maatgevende arbeid, uren per week, vast maatmanuurloon met toelichting |
| 4 | `Stap4Fml` | Vereenvoudigd belastbaarheidsprofiel per rubriek, beperkt / niet beperkt |
| 5 | `Stap5Voorselectie` | Transparante voorselectie: per functie de formele grond of de groen/oranje/rood-strip; uitleg dat een signalering geen oordeel is |
| 6 | `Stap6Beoordelen` | Overzicht van de te beoordelen functies met voortgang; per functie een detailpagina (`FunctieDetail`) met `Vergelijkingstabel` en `Beoordelingsformulier` |
| 7 | `Stap7Eindselectie` | Precies drie functies; niet-uitgesloten, geldig als geschikt beoordeeld; het arbeidsplaatsencriterium is bewust "probeerbaar" als leermoment |
| 8 | `Stap8Berekening` | Eerst zelf rekenen, daarna `BerekeningOverzicht` met alle tussenstappen, klasse-indeling, berekeningsdisclaimer en controle van de eigen uitkomst |
| 9 | `Stap9Reflectie` | Evaluatie (formele fouten, gemiste signaleringen, motiveringskwaliteit, consistentie, berekening, modelvergelijking), antwoordmodel, vijf reflectievragen, printvriendelijk overzicht, export als JSON, reset |

Het oordeel per functie kent vier waarden (`geschikt`, `geschikt-na-motivering`, `aanvullende-informatie`, `niet-geschikt`); een oordeel is pas geldig met een motivering van minimaal 25 tekens en, bij "aanvullende informatie nodig", een omschrijving van welke informatie ontbreekt. Oranje en rode punten moeten per functie als "beoordeeld" worden aangevinkt; een niet-aangevinkt punt telt in stap 9 als gemiste signalering. Een functie die later als niet geschikt wordt beoordeeld, verdwijnt automatisch uit de eindselectie.

De sessie (`src/lib/sessie.ts`) is een pure reducer; `SessieProvider` koppelt hem aan React en aan de lokale opslag. Alle stappen blijven bereikbaar via de voortgangsbalk; teruggaan verliest niets.

## Datastructuur

Alle inhoud staat in `src/data`:

```
src/data/
├── beoordelingspunten.json          # 16 beoordelingspunten (vereenvoudigde FML-structuur)
├── functies/trainingsfuncties.json  # 15 fictieve trainingsfuncties (TRN-001 … TRN-015)
├── casussen/sam-de-vries.json       # casus incl. cliëntbeeld, profiel en antwoordmodel
└── index.ts                         # laadt en valideert de JSON, opzoekfuncties
```

De TypeScript-types staan in `src/lib/types.ts`; de validatie in `src/data/index.ts` controleert bij het opstarten en in `npm test` onder meer unieke codes, het codeformaat `TRN-000`, bekende beoordelingspunten en niveaus, en of het antwoordmodel iedere functie dekt.

### Beoordelingspunt

```jsonc
{
  "id": "tillen-incidenteel",
  "rubriek": "dynamische-handelingen",   // persoonlijk-functioneren | sociaal-functioneren | fysieke-omgevingseisen | dynamische-handelingen | statische-houdingen | werktijden
  "naam": "Tillen, incidenteel",
  "omschrijving": "…",
  "type": "numeriek-max",                 // of "ordinaal"
  "eenheid": "kg",                        // alleen bij numeriek-max
  "trefwoorden": ["tillen", "kg", "…"]    // voor de motiveringscontrole in stap 9
}
```

Een ordinaal punt heeft in plaats van `eenheid` een oplopende lijst `niveaus` (van licht naar zwaar) en optioneel `niveauLabels`.

### Functie

```jsonc
{
  "code": "TRN-002",                     // verplicht formaat TRN-000, uniek
  "naam": "Medewerker interne post",
  "taakomschrijving": "…",
  "taken": ["…"],
  "opleidingsniveau": "vmbo",            // basis | vmbo | mbo1 | mbo2 | mbo3 | mbo4 | hbo | wo
  "opleidingsrichting": ["logistiek"],   // optioneel; cliënt moet één van deze richtingen hebben
  "ervaring": "…",
  "vereisteVaardigheden": [               // { soort: "computer", niveau } | { soort: "rijbewijs", categorie } | { soort: "nederlands"|"engels", niveau }
    { "soort": "nederlands", "niveau": "basis" }
  ],
  "uurloon": 13.9,
  "werktijden": {
    "urenPerWeek": 32,
    "minimumUrenPerWeek": 20,            // kleinste contractomvang die de functie biedt
    "urenPerDag": 8,
    "nachtdienst": "nooit",              // nooit | incidenteel | regelmatig | uitsluitend
    "toelichting": "…"
  },
  "arbeidsplaatsen": 8,                  // fictief aantal; minimaal 3 voor de eindselectie
  "belasting": [
    { "puntId": "lopen", "waarde": 45, "toelichting": "…" }   // waarde: getal (numeriek-max) of niveau (ordinaal)
  ],
  "docentToelichting": "…"               // alleen zichtbaar in de docentmodus
}
```

### Casus

```jsonc
{
  "id": "sam-de-vries",                   // wordt de URL: /casus/sam-de-vries/stap/1
  "titel": "…", "ondertitel": "…", "fictiefMelding": "…",
  "client": {
    "naam": "…", "leeftijd": 47,
    "opleidingsniveau": "mbo2", "opleidingsrichting": ["logistiek"],
    "werkervaring": "…", "werkervaringJaren": 18,
    "vaardigheden": { "computer": "basis", "rijbewijs": ["B"], "nederlands": "goed", "engels": "basis" },
    "situatieschets": "…"                  // bewust zonder medische gegevens
  },
  "maatgevendeArbeid": { "functie": "…", "omschrijving": "…", "urenPerWeek": 38, "maatmanuurloon": 22.4, "toelichting": "…" },
  "belastbaarheid": [
    { "puntId": "tillen-incidenteel", "waarde": 10, "beperkt": true, "toelichting": "…" }
  ],
  "docentmodel": {
    "inleiding": "…",
    "referentieselectie": ["TRN-005", "TRN-001", "TRN-007"],
    "functies": {
      "TRN-001": {
        "verwachteBeoordeling": "geschikt",
        "verdedigbareAlternatieven": ["geschikt-na-motivering"],
        "argumenten": ["…"],
        "relevanteSignaleringen": [],       // punt-id's die de deelnemer moet benoemen
        "alternatieveAfweging": "…",
        "aanvullendeInformatie": "…"
      }
    }
  }
}
```

De belastbaarheid bevat per beoordelingspunt de **grens** van de cliënt: bij een numeriek punt het maximum, bij een ordinaal punt het hoogste toelaatbare niveau. De werktijdgrenzen (uren per dag, uren per week, nachtdienst) staan als gewone beoordelingspunten in het profiel.

## Functies toevoegen

1. Voeg een object toe aan `src/data/functies/trainingsfuncties.json` met een nieuwe, unieke code in het formaat `TRN-016`.
2. Vul de belasting in voor de beoordelingspunten die voor de functie relevant zijn. Alleen punten die zowel in het belastbaarheidsprofiel als in de functie staan, worden vergeleken en getoond; een ontbrekend punt wordt overgeslagen. De werktijden hoeven niet in `belasting`: de simulator leidt `uren-per-dag`, `uren-per-week` (uit `minimumUrenPerWeek`) en `nachtdienst` af uit het object `werktijden`.
3. Voeg voor **iedere casus** een antwoordmodel toe onder `docentmodel.functies["TRN-016"]`; de validatie weigert anders te starten.
4. Draai `npm test` — de datatests melden precies wat er ontbreekt.

Gebruik uitsluitend fictieve functies en nooit bestaande functiecodes.

## Casussen toevoegen

1. Maak `src/data/casussen/<nieuwe-id>.json` aan volgens de structuur hierboven (gebruik `sam-de-vries.json` als sjabloon).
2. Importeer het bestand in `src/data/index.ts` en voeg het toe aan de array `casussen`.
3. Zorg dat het antwoordmodel alle functies dekt en dat de `referentieselectie` bestaat uit drie niet-uitgesloten functies met elk minimaal drie arbeidsplaatsen.
4. De startpagina en de docentmodus tonen de nieuwe casus automatisch; de routes `/casus/<nieuwe-id>/stap/1` … `/stap/9` ontstaan bij de build.

Wilt u een ander belastbaarheidsprofiel met dezelfde functies? Kopieer de casus en pas alleen `client` en `belastbaarheid` aan; de voorselectie en de signaleringen volgen automatisch.

## Rekenregels aanpassen

Alle drempels en teksten staan in `src/lib/regels.ts`:

| Constante | Standaard | Betekenis |
| --- | --- | --- |
| `numeriekeSignaleringsfactor` | 1,5 | numeriek punt: tot en met deze factor boven de grens is een overschrijding oranje, daarboven rood |
| `evidenteOverschrijdingsfactor` | 3 | vanaf deze factor sluit de voorselectie de functie uit ("evidente overschrijding") |
| `ordinaleStappenRood` | 2 | ordinaal punt: één niveau boven de grens is oranje, vanaf twee niveaus rood |
| `minimumFunctiesVoorBerekening` / `maximumFunctiesEindselectie` | 3 / 3 | de eindselectie bestaat uit precies drie functies |
| `minimumArbeidsplaatsenPerFunctie` | 3 | fictieve ondergrens per functie |
| `minimumMotiveringLengte` | 25 | minimale lengte van een motivering (tekens) |
| `tolerantieEigenBerekening` | 0,011 | toegestane afwijking bij de controle van de eigen berekening (euro resp. procentpunt) |

Daarnaast: `AO_KLASSEN` (klassegrenzen en labels), `DISCLAIMER`, `BEREKENINGSDISCLAIMER`, `SIGNALERINGSUITLEG`, `STAPPEN` (titels van de negen stappen) en `PRODUCTNAAM`.

De berekening zelf staat in `src/lib/berekening.ts` en rekent in centen:

1. sorteer de drie uurlonen oplopend (stabiel op functiecode);
2. het middelste uurloon is de resterende verdiencapaciteit per uur;
3. loonverlies = maatmanuurloon − resterende verdiencapaciteit (begrensd op 0; de vlag `rvcHogerDanMaatman` legt uit waarom);
4. AO-percentage = loonverlies ÷ maatmanuurloon × 100, onafgerond bewaard;
5. klasse-indeling volgens `AO_KLASSEN`; afronding gebeurt uitsluitend in `formatEuro`/`formatPercentage`.

Wie een andere rekenwijze wil (bijvoorbeeld een gewogen gemiddelde), past `berekenVerdiencapaciteit` aan en de tests in `src/lib/__tests__/berekening.test.ts`; de interface toont automatisch de `stappen` die de functie teruggeeft.

De uitsluitingsregels van de voorselectie staan in `src/lib/voorselectie.ts` (`controleer…`-functies), de kleurregels in `src/lib/vergelijking.ts`, de evaluatie-aspecten en reflectievragen in `src/lib/evaluatie.ts`.

## Docentmodus

`/docent` toont per casus:

- het cliëntbeeld en de kerngetallen;
- het **antwoordmodel** per functie: docentcategorie (geschikt / twijfelachtig / ongeschikt / uitgesloten), verwachte beoordeling, verdedigbare alternatieven, argumenten, relevante signaleringen, alternatieve afweging, op te vragen informatie en de docenttoelichting;
- een **controleberekening** op de referentieselectie en een hulpmiddel om iedere andere selectie van drie functies door te rekenen;
- de **voortgang** van de deelnemer in deze browser (aantal beoordelingen, eindselectie, uitkomst) en een reset;
- aandachtspunten voor de **nabespreking** en uitleg hoe de deelnemer wordt geëvalueerd;
- waar de **data** staat en hoe u die beheert.

Toegangscode: zet `NEXT_PUBLIC_DOCENT_CODE=<code>` in `.env.local` (of in de omgeving van de build). De code geldt per browsertabblad (`sessionStorage`). Omdat `NEXT_PUBLIC_`-variabelen in de browserbundel terechtkomen, is dit een drempel tegen per ongeluk meekijken — geen beveiliging. Zonder variabele is de docentmodus vrij toegankelijk.

Het antwoordmodel is in stap 9 ook voor de deelnemer zichtbaar (in- en uitklapbaar, standaard uitgeklapt zodra alle functies zijn beoordeeld).

## Opslag, export en privacy

- De voortgang wordt na iedere wijziging bewaard in `localStorage` onder `adc-claimsimulator:sessie:<casus-id>`; de docentontgrendeling in `sessionStorage`.
- Er wordt niets naar een server gestuurd. De enige persoonlijke invoer is een optionele naam.
- "Opnieuw beginnen" wist de opgeslagen sessie na bevestiging.
- Stap 9 exporteert de volledige sessie inclusief evaluatie en berekening als JSON en biedt een printvriendelijk overzicht (`window.print`; navigatie en knoppen zijn verborgen in de afdruk).
- Kan de browser niets bewaren (privévenster, volle opslag), dan meldt de interface dat en blijft de training bruikbaar binnen de sessie.

## Beperkingen van v1

- Eén casus en vijftien functies; geen beheerinterface — data wordt in JSON bewerkt.
- De motiveringscontrole in stap 9 is een transparante trefwoordcontrole (aspecten frequentie, duur, omstandigheden, herstel, belastbaarheid en het benoemen van signaleringen). Zij vervangt de beoordeling door een docent niet en herkent geen synoniemen buiten de trefwoordenlijst.
- Voortgang is gebonden aan één browser op één apparaat; er is geen account, synchronisatie of docentinzage op afstand. De docent ziet alleen sessies in dezelfde browser of via de JSON-export van de deelnemer.
- De docentcode is een drempel, geen autorisatie.
- De printweergave is functioneel (geen aparte opmaak per printer); PDF-export loopt via de printdialoog van de browser.
- Het maatmanuurloon is een vast gegeven per casus; het vaststellen van het maatmanloon en de daadwerkelijke functieduidingsregels vallen buiten de simulator.
- De interface is desktop-first; op smalle schermen werkt zij, maar tabellen scrollen horizontaal.

## Voorstellen voor v2

- Meerdere casussen met verschillende profielen (psychisch, fysiek, urenbeperking) en een casuskeuze met moeilijkheidsgraad.
- Docentbeheer in de interface: functies en antwoordmodellen bewerken, met dezelfde validatie, en importeren/exporteren van casusbestanden.
- Invoer van de belastbaarheid door de deelnemer als extra oefenstap (van rapportagetekst naar profiel).
- Opslag op een server met docentaccounts, groepen en inzage in ingeleverde sessies; rubrics en docentfeedback per motivering.
- Rijker motiveringsmodel (bijvoorbeeld beoordeling door een taalmodel met vaste rubrics) als aanvulling op de trefwoordcontrole, met de docent als eindbeoordelaar.
- Een oefening met de urenomvang (verdiencapaciteit bij minder uren) en varianten van de rekenregel, inclusief uitleg van de verschillen.
- Toegankelijkheidsaudit (WCAG 2.2 AA) en gebruikersonderzoek met een groep deelnemers.
- Vervanging van het tekstlogo door het definitieve AD-Consult-logo (`data-logo-placeholder` in `src/components/AppShell.tsx`).

## Scripts

| Script | Doel |
| --- | --- |
| `npm run dev` | ontwikkelserver |
| `npm run build` / `npm start` | productiebuild en -server |
| `npm test` / `npm run test:watch` | tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | lint, typecheck en tests achter elkaar |

---

© AD-Consult. Educatief product; geen UWV-product. Alle gegevens zijn fictief.
