# FoodPrice Analytics Sénégal

Application pédagogique d'analyse des prix des denrées alimentaires et de prévision exploratoire.
Frontend React + Vite, backend FastAPI, Pandas et scikit-learn.

> **Données :** `backend/data/processed/demo_prices.csv` est un jeu de données synthétique créé pour tester l'application. Il ne représente pas les prix réels des marchés sénégalais. Remplacez-le par un jeu de données public vérifié avant toute conclusion sur les prix réels.

## Fonctionnalités MVP
- Tableau de bord avec indicateurs et graphique historique.
- Navigation multipage avec React Router : menu latéral repliable sur ordinateur,
  tiroir mobile et indication de la page active.
- Routes distinctes : `/tableau-de-bord`, `/prix`, `/marches`, `/comparer`,
  `/previsions` et `/donnees`, plus une page 404.
- Filtres produit, région et marché partageables dans l'URL et conservés entre
  les routes ; chargement et cache des données avec TanStack Query.
- Barre d'onglets mobile et panneaux internes défilants sur ordinateur.
- Filtres combinables par produit, région et marché, avec option pour tout afficher.
- Tableau paginé des observations avec date, source, marché et type de données.
- API REST FastAPI.
- Prévision exploratoire à 7, 15 ou 30 jours.
- Prévisions calculées sur un seul marché et après normalisation des unités prises en charge (FCFA/kg ou FCFA/L) ; les sélections incompatibles sont refusées.
- Évaluation temporelle simple (MAE et RMSE) si les données le permettent.
- Export CSV des données correspondant aux filtres actifs.
- Indicateur de connexion à l'API et actualisation des données.
- Thème clair/sombre, mémorisé sur cet appareil et appliqué à toutes les pages.
- Documentation interactive de l'API.

Le bouton « Sombre » ou « Clair » dans l'en-tête permet de changer de thème.
Lors de la première visite, l'application suit le thème du système ; le choix
effectué est ensuite mémorisé dans le navigateur.

Les anciennes routes `/dashboard`, `/analysis` et `/predictions` redirigent vers
leurs nouvelles adresses. Les pages Marchés, Comparateur et Sources/qualité
disposent déjà de leur navigation et de leur structure ; leurs fonctionnalités
géographiques et analytiques avancées seront raccordées aux référentiels et
endpoints des phases suivantes du cahier des charges.

## Prérequis
- Node.js LTS
- Python 3.11 ou 3.12 recommandé
- VS Code

## Lancer le projet depuis Git Bash

Les deux applications ont leurs dépendances dans leurs sous-dossiers respectifs :
le `package.json` du frontend est dans `frontend/` et l'environnement Python du
backend est dans `backend/.venv/`. Depuis la racine du projet, ouvrez deux
terminaux Git Bash.

Dans le premier terminal, installez puis démarrez le backend :

```bash
cd backend
py -3.13 -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Dans le second terminal, démarrez le frontend :

```bash
cd frontend
npm ci
npm run dev
```

Si un serveur Vite tourne déjà, arrêtez-le avec `Ctrl+C` avant `npm ci` afin
que npm puisse remplacer les modules natifs Windows verrouillés par le serveur.

Si l'environnement virtuel existe déjà, ne relancez pas `py -3.13 -m venv
.venv`. Pour démarrer le backend depuis la racine sans l'activer, utilisez :

```bash
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

L'API est disponible sur http://127.0.0.1:8000 et Vite affiche l'adresse du
frontend, généralement http://localhost:5173.

## 1. Lancer le backend (Windows PowerShell)
Depuis le dossier racine :

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Si `py -3.12` n'est pas disponible, utilisez `py -m venv .venv` avec une version Python compatible installée. En cas de blocage PowerShell, lancez `backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload` depuis le dossier backend.

API : http://127.0.0.1:8000  
Documentation : http://127.0.0.1:8000/docs

## 2. Lancer le frontend
Dans un second terminal, depuis le dossier racine :

```powershell
cd frontend
npm ci
npm run dev
```

Ouvrir l'URL Vite affichée, généralement http://localhost:5173.

## API principale
- `GET /api/health`
- `GET /api/products`
- `GET /api/regions`
- `GET /api/markets?product=Riz&region=Dakar`
- `GET /api/prices?product=Riz&region=Dakar&market=Marché`
- `GET /api/analytics/summary?product=Riz&region=Dakar&market=Marché`
- `GET /api/analytics/trends?product=Riz&region=Dakar&market=Marché`
- `POST /api/predictions` avec `{"product":"Riz","region":"Dakar","horizon_days":7}`
- `GET /api/predictions/metrics?product=Riz&region=Dakar&market=Marché`
- `GET /api/prices/export?product=Riz&region=Dakar&market=Marché`

## Remplacer les données de démonstration
Le backend lit `backend/data/processed/demo_prices.csv` par défaut. Pour intégrer un vrai fichier :
1. vérifier la provenance, la licence, les unités et les dates ;
2. transformer les colonnes vers le schéma `date,product,region,market,price,unit,currency,source,data_type` ;
3. enregistrer le fichier normalisé dans `backend/data/processed/demo_prices.csv` ou modifier `DATA_FILE` ;
4. utiliser `data_type=observed` pour les observations réelles et `data_type=synthetic` pour les exemples synthétiques ;
5. relancer l'API et contrôler les résultats.

Le système ne collecte pas automatiquement les prix et ne prétend pas accéder à une source privée.
Pour un déploiement, définissez `VITE_API_URL` dans l'environnement du frontend ;
l'API, y compris l'export CSV, utilise cette même URL.

Les prévisions choisissent un marché précis et convertissent les unités reconnues
(par exemple grammes, kilogrammes, litres et contenances de bidons) en FCFA/kg
ou FCFA/L. Une devise ou une unité inconnue, ou plusieurs marchés sans sélection
explicite, provoque une erreur de validation plutôt qu'une moyenne trompeuse.

## Limites
- Les données livrées sont synthétiques.
- Les prévisions sont expérimentales et ne doivent pas servir à des décisions commerciales ou publiques sans validation indépendante.
- Le modèle a besoin d'un historique suffisant et régulier pour être utile.
