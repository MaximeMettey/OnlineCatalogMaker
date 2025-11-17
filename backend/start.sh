#!/bin/bash
# Script de démarrage du backend avec activation automatique du venv Python

cd "$(dirname "$0")"

# Vérifier que le venv existe
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Creating it..."
    python3 -m venv venv
    source venv/bin/activate
    echo "📦 Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r python/requirements.txt
else
    source venv/bin/activate
fi

# Vérifier que pymupdf est installé
python3 -c "import pymupdf" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ PyMuPDF not installed. Installing dependencies..."
    pip install -r python/requirements.txt
fi

echo "✅ Python environment ready (venv activated)"
echo "🚀 Starting backend server..."
npm run dev
