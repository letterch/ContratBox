/**
 * Fourchettes de primes indicatives pour le marché suisse de l'assurance.
 * Sources : FINMA, comparis.ch, moneyland.ch — données 2024-2025.
 * Ces valeurs sont injectées dans le prompt système de l'assistant IA
 * pour qu'il puisse positionner une police par rapport au marché.
 */

export const SWISS_INSURANCE_BENCHMARK = `
Fourchettes indicatives primes annuelles (marché suisse 2024-2025) :

ASSURANCE MALADIE (LAMal obligatoire)
- Adulte >26 ans, franchise 2500 : CHF 2'800 – 5'400/an selon canton et caisse
- Adulte >26 ans, franchise 300 : CHF 4'200 – 7'800/an
- Jeune adulte 19-25 : 10-20% de réduction sur les primes adultes
- Enfant <18 : CHF 1'000 – 1'800/an
- Cantons les plus chers : BS, GE, VD, TI — les moins chers : AI, NW, UR
- Assureurs principaux : CSS, Helsana, Swica, Groupe Mutuel, Assura, Concordia, Visana, Sanitas

COMPLÉMENTAIRE SANTÉ
- Ambulatoire (médecine alternative, transport) : CHF 150 – 600/an
- Hospitalisation (chambre privée/demi-privée) : CHF 800 – 4'000/an
- Dentaire : CHF 150 – 500/an
- Assureurs : Helsana, CSS, Swica, Visana, Concordia

RC PRIVÉE / MÉNAGE (combinée)
- Ménage seul : CHF 150 – 400/an (somme assurée 50-100k)
- RC privée seule : CHF 80 – 200/an (somme assurée 5-10M)
- Combinée ménage + RC : CHF 250 – 600/an
- Facteurs : taille logement, valeur mobilier, vol, bris de glace
- Assureurs : Mobilière, Helvetia, AXA, Zurich, Bâloise, Generali, Vaudoise

ASSURANCE BÂTIMENT
- Propriétaire appartement PPE : CHF 200 – 600/an
- Villa individuelle : CHF 400 – 1'500/an (selon valeur assurée, région)
- Couvertures : incendie, dommages naturels, dégâts d'eau, bris de glace
- Cantons obligatoires (ECA) : VD, VS, FR, GE, NE, JU, BE, AG, ZH, etc. (17 cantons)
- Cantons sans ECA (privé obligatoire) : GR, VS, TI, UR, SZ, OW, NW, AI, AR

ASSURANCE AUTO
- RC obligatoire seule : CHF 400 – 1'200/an
- Casco partielle : CHF 200 – 600/an en plus
- Casco complète : CHF 600 – 2'500/an en plus
- Facteurs : âge conducteur, bonus/malus, puissance, km/an, domicile
- Assureurs : TCS, Mobilière, AXA, Zurich, Helvetia, Bâloise, Vaudoise

ASSURANCE VIE (3a / libre)
- Pilier 3a risque pur (décès + invalidité) : CHF 300 – 1'200/an
- Pilier 3a mixte (épargne + risque) : CHF 2'000 – 6'883/an (plafond 2025)
- Assurance vie libre (hors 3a) : CHF 500 – 3'000/an
- Assureurs : Swiss Life, AXA, Helvetia, Bâloise, Pax, Generali

PROTECTION JURIDIQUE
- Privée : CHF 200 – 500/an
- Circulation : CHF 100 – 250/an
- Combinée : CHF 350 – 700/an
- Assureurs : DAS, CAP, Protekta (Mobilière), Coop, TCS

TÉLÉCOM
- Mobile seul : CHF 10 – 60/mois
- Internet (fibre) : CHF 40 – 80/mois
- Combiné mobile + internet : CHF 50 – 120/mois
- Opérateurs : Swisscom, Sunrise, Salt, Wingo, Yallo, M-Budget

ÉNERGIE (électricité)
- Ménage moyen (3-4 pièces) : CHF 80 – 180/mois selon fournisseur et tarif
- Propriétaire maison : CHF 120 – 300/mois
- Hausse tarifs 2024-2025 : +15-25% en moyenne

HYPOTHÈQUES (taux indicatifs 2025)
- Fixe 2 ans : 1.3 – 1.8%
- Fixe 5 ans : 1.4 – 2.0%
- Fixe 10 ans : 1.6 – 2.3%
- SARON : marge 0.5 – 0.9% + SARON (~1.5%)
- Banques : UBS, CS (intégrée UBS), Raiffeisen, ZKB, BCGE, BCV, PostFinance
`.trim()
