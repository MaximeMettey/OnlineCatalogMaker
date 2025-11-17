# Setup Local - OnlineCatalogMaker

Guide complet pour installer et démarrer l'application en local.

## 📋 Prérequis

### 1. Node.js 18+
```bash
node --version  # Doit être >= 18.x
```

### 2. Python 3.8+
```bash
python3 --version  # Doit être >= 3.8
```

### 3. npm ou yarn
```bash
npm --version
```

## 🚀 Installation

### 1. Cloner le repository
```bash
git clone https://github.com/MaximeMettey/OnlineCatalogMaker.git
cd OnlineCatalogMaker
```

### 2. Installer les dépendances Backend (Node.js)
```bash
cd backend
npm install
```

### 3. Installer les dépendances Python (PyMuPDF)
```bash
# Créer un environnement virtuel (recommandé)
python3 -m venv venv
source venv/bin/activate  # Sur Linux/Mac
# ou
venv\Scripts\activate  # Sur Windows

# Installer les dépendances
pip install -r python/requirements.txt
```

**Packages installés :**
- `pymupdf` - Traitement PDF robuste (remplace l'ancien `fitz` déprécié)
- `Pillow` - Manipulation d'images

### 4. Installer les dépendances Frontend (React)
```bash
cd ../frontend
npm install
```

### 5. Configuration

Le fichier `.env` existe déjà dans `backend/.env`. Vérifiez les paramètres :

```bash
cd ../backend
cat .env
```

Vous devriez voir :
```env
PORT=3000
NODE_ENV=development
DB_CLIENT=sqlite3
DB_FILENAME=./data/catalogs.db
JWT_SECRET=dev-secret-key-change-in-production-12345
# ...
```

## ▶️ Démarrer l'application

### Terminal 1 - Backend (Node.js + Python)
```bash
cd ~/Documents/dev/OnlineCatalogMaker/backend

# Activer l'environnement virtuel Python
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Démarrer le serveur
npm run dev
```

**Le backend démarre sur** : http://localhost:3000

Vous devriez voir :
```
Initializing database...
Database initialized successfully
Server running on port 3000
Environment: development
CORS enabled for: http://localhost:5173
```

### Terminal 2 - Frontend (React + Vite)
```bash
cd ~/Documents/dev/OnlineCatalogMaker/frontend
npm run dev
```

**Le frontend démarre sur** : http://localhost:5173

Vous devriez voir :
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

## 🎯 Première utilisation

### 1. Créer un compte admin
1. Ouvrez http://localhost:5173/register
2. Entrez votre email et mot de passe (min 8 caractères)
3. Cliquez sur "Register"

### 2. Accéder au dashboard
Vous serez automatiquement redirigé vers http://localhost:5173/admin

### 3. Uploader votre premier PDF
1. Cliquez sur "Upload New Catalog"
2. Donnez un nom au catalogue
3. Sélectionnez un fichier PDF
4. Cliquez sur "Upload"

Le traitement commence automatiquement avec **PyMuPDF** :
- Détection des double-pages
- Découpage en pages individuelles
- Génération d'images haute qualité (PNG/JPG)
- Extraction de texte avec positions précises

## 🔧 Architecture Hybride

L'application utilise une architecture **Node.js + Python** :

### Backend Node.js
- API REST (Express)
- Authentification JWT
- Gestion de la base de données SQLite
- Upload de fichiers
- Orchestration

### Service Python (PyMuPDF)
- **Traitement PDF** : Utilise PyMuPDF pour maximum de robustesse
- **Découpage de pages** : Split des double-pages automatique
- **Génération d'images** : PNG et JPG haute qualité
- **Extraction de texte** : Positions précises des mots et paragraphes

### Communication
Node.js appelle le script Python via `subprocess.spawn()` pour chaque opération PDF.

## 📂 Structure des fichiers

```
OnlineCatalogMaker/
├── backend/
│   ├── python/
│   │   ├── pdf_processor.py     # Script PyMuPDF
│   │   └── requirements.txt     # Dépendances Python
│   ├── src/
│   │   ├── services/pdf/
│   │   │   └── pythonProcessor.js  # Bridge Node→Python
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── server.js
│   ├── venv/                    # Environnement virtuel Python
│   └── package.json
└── frontend/
    ├── src/
    └── package.json
```

## ✅ Vérifications

### Backend fonctionne ?
```bash
curl http://localhost:3000/health
# Réponse attendue: {"status":"ok","timestamp":"..."}
```

### Python accessible ?
```bash
cd backend
source venv/bin/activate
python3 python/pdf_processor.py
# Doit afficher l'usage
```

### Frontend fonctionne ?
Ouvrez http://localhost:5173 dans votre navigateur

## 🐛 Problèmes courants

### Python not found
```bash
# Vérifier que Python 3 est installé
python3 --version

# Sur certains systèmes, utiliser 'python' au lieu de 'python3'
which python3
```

**Solution** : Modifier `pythonProcessor.js` ligne 16 :
```javascript
const python = spawn('python', pythonArgs);  // au lieu de 'python3'
```

### PyMuPDF ne s'installe pas
```bash
# Installer les dépendances système nécessaires (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install python3-dev python3-pip

# Réessayer l'installation
pip install pymupdf
```

### Port déjà utilisé
- **Backend (3000)** : Changez `PORT` dans `backend/.env`
- **Frontend (5173)** : Vite choisira automatiquement un autre port

### Erreur "Invalid or expired token"
1. Ouvrez la console navigateur (F12)
2. Tapez : `localStorage.clear()`
3. Rechargez la page
4. Reconnectez-vous

## 📊 Performance

**PyMuPDF vs JS natif** :
- ✅ **5-10x plus rapide** pour les PDFs complexes
- ✅ **Meilleure qualité d'images**
- ✅ **Extraction de texte plus précise**
- ✅ **Gestion robuste des PDFs corrompus**
- ✅ **Support natif de tous les formats PDF**

## 🎓 Pour aller plus loin

- **Production** : Voir `README.md` section "Production Build"
- **PostgreSQL** : Voir `README.md` section "Migration to PostgreSQL"
- **API** : Voir `README.md` section "API Documentation"
- **Architecture** : Voir `ARCHITECTURE.md`

## 💡 Conseils

1. **Toujours activer l'environnement virtuel Python** avant de démarrer le backend
2. **Utilisez des PDFs de test** petits au début
3. **Vérifiez les logs** en console pour debugger
4. **La première installation peut prendre quelques minutes** (dépendances)

Vous êtes prêt ! 🚀
