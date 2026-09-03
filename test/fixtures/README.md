# Fixtures

Dumps réels de l'API, figés le 2026-09-03. Ils servent de filet de sécurité :
les tests décrivent le comportement **actuel** du code (bugs compris), afin que
la phase 1 (extraction de la couche données) puisse être vérifiée par diff.

| Fichier | Endpoint |
|---|---|
| `agenda.json` | `GET /events/{eventId}/agenda` (`Accept: application/json; version=4`) |
| `partners.json` | `GET /events/{eventId}/partners/activities` |

Les cas limites absents du dump réel (session sans horaire rattaché,
`session_id === "null"`, URL sans schéma) sont construits à la main dans les
tests plutôt qu'ajoutés à ces dumps, pour que ceux-ci restent une capture
fidèle de l'API.
