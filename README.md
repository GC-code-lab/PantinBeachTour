# Pantin Beach Tour

Site web du tournoi de beach volley. Côté public : poules (équipes, matchs, résultats) et tableau des phases finales. Les inscriptions et la gestion du tournoi (poules, matchs, scores) se font depuis l'espace admin.

## Aperçu en local

Depuis ce dossier :

```
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000 dans le navigateur.

## Stack

- HTML / CSS / JS (pas de build, pas de framework)
- [Supabase](https://supabase.com) pour la base de données, l'authentification et le temps réel
- Hébergement : GitHub Pages
