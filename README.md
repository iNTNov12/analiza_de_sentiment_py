# Analiza de Sentiment - Energie România

Aplicație web pentru analiza sentimentelor din discuțiile despre energia din România pe platforma X (fostul Twitter) în perioada 2014-2024.

## Caracteristici

- Analiză în timp real a sentimentelor (pozitiv/negativ/neutru)
- Vizualizare evoluție temporală a sentimentelor
- Word cloud pentru cuvintele cheie cele mai des folosite
- Listă cu postări recente și evaluarea lor
- Interfață utilizator modernă și responsivă

## Cerințe preliminare

- Python 3.8+
- pip (sistem de gestionare a pachetelor Python)
- Cont de dezvoltator Twitter (pentru API)

## Instalare

1. Clonați sau descărcați acest repository
2. Creați un mediu virtual Python (recomandat):
   ```
   python -m venv venv
   .\\venv\\Scripts\\activate  # Pe Windows
   ```
3. Instalați dependențele:
   ```
   pip install -r requirements.txt
   ```
4. Creați un fișier `.env` în directorul rădăcină cu următoarele variabile de mediu:
   ```
   TWITTER_API_KEY=your_api_key
   TWITTER_API_SECRET=your_api_secret
   TWITTER_ACCESS_TOKEN=your_access_token
   TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
   ```

## Utilizare

1. Porniți serverul Flask:
   ```
   python app.py
   ```
2. Deschideți browser-ul la adresa `http://localhost:5000`
3. Selectați un cuvânt cheie, intervalul de timp și apăsați "Analizează"

## Implementare Twitter API

Pentru a utiliza date reale de pe Twitter, este necesar să obțineți credențiale de la [Twitter Developer Portal](https://developer.twitter.com/):

1. Creați un cont de dezvoltator
2. Creați o aplicație nouă
3. Obțineți cheile API și token-urile
4. Adăugați-le în fișierul `.env`

## Tehnologii utilizate

- **Backend**: Python, Flask
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5, Plotly.js
- **Procesare limbaj natural**: NLTK, VADER
- **Vizualizare date**: Plotly, WordCloud

## Licență

Acest proiect este licențiat sub licența MIT - vezi fișierul [LICENSE](LICENSE) pentru detalii.

## Contribuții

Contribuțiile sunt binevenite! Vă rugăm să deschideți mai întâi un subiect de discuție pentru a discuta despre modificările pe care doriți să le faceți.
