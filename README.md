# Sand System Tournament (Pantin Beach Tour)

Site web de gestion d'un tournoi de beach volley : inscriptions, poules, qualifications, tableau final, ordre des matchs, suivi d'équipe et palmarès. Partie publique consultable par tous, partie admin protégée par compte.

👉 **Toute la documentation est dans [GUIDE.md](GUIDE.md).**

## Aperçu en local

Depuis ce dossier :

```
python3 serve.py
```

Puis ouvrir http://localhost:8000 dans le navigateur (`serve.py` désactive le cache navigateur, pratique pendant le développement).

## Stack

- HTML / CSS / JS (pas de build, pas de framework)
- [Supabase](https://supabase.com) pour la base de données et l'authentification
- Hébergement : GitHub Pages — https://gc-code-lab.github.io/PantinBeachTour/
