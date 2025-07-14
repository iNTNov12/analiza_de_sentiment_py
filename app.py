import os
from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
import pandas as pd
import plotly.express as px
import plotly.io as pio
import json
from datetime import datetime, timedelta
import tweepy
from nltk.sentiment import SentimentIntensityAnalyzer
import nltk
from wordcloud import WordCloud
import io
import base64
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

# Download required NLTK data
nltk.download('vader_lexicon')
nltk.download('stopwords')

app = Flask(__name__)
CORS(app)

# Initialize sentiment analyzer
sia = SentimentIntensityAnalyzer()

# Initialize Twitter API client
def get_twitter_client():
    try:
        client = tweepy.Client(
            bearer_token=os.getenv('TWITTER_BEARER_TOKEN'),
            consumer_key=os.getenv('TWITTER_API_KEY'),
            consumer_secret=os.getenv('TWITTER_API_SECRET'),
            access_token=os.getenv('TWITTER_ACCESS_TOKEN'),
            access_token_secret=os.getenv('TWITTER_ACCESS_TOKEN_SECRET'),
            wait_on_rate_limit=True
        )
        return client
    except Exception as e:
        print(f"Error initializing Twitter client: {str(e)}")
        return None

# Common keywords for energy-related searches in Romanian
sample_keywords = [
    "energie românia", "electricitate preț", "factură energie", "energie verde",
    "tranziție energetică", "energie nucleară", "energie regenerabilă", "hidrocentrale",
    "eolian românia", "solar românia", "energie hidro", "energie termică",
    "factură electricitate", "ANRE", "Hidroelectrica", "Nuclearelectrica",
    "Transelectrica", "Transelectrica", "Tăriceanul", "Portile de Fier",
    "Cernavodă", "Cernavoda", "energie fotovoltaică", "panouri solare",
    "parc eolian", "parc fotovoltaic", "preț energie electrică", "criza energetică",
    "energie regenerabilă", "energie verde", "certificat verde"
]

def clean_tweet_text(text):
    """Clean tweet text by removing URLs, mentions, and special characters"""
    # Remove URLs
    text = re.sub(r'http\S+|www.\S+', '', text, flags=re.MULTILINE)
    # Remove mentions
    text = re.sub(r'@\w+', '', text)
    # Remove special characters and numbers
    text = re.sub(r'[^\w\săâîșțĂÂÎȘȚ]', ' ', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text.strip()

def get_tweets(keyword, count=100, start_date=None, end_date=None):
    """Fetch tweets using Twitter API v2"""
    client = get_twitter_client()
    if not client:
        return []
    
    try:
        # Format query for recent search
        query = f"{keyword} lang:ro -is:retweet -is:reply"
        
        # Convert dates to the required format
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        else:
            start_date = datetime.now() - timedelta(days=30)
            
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        else:
            end_date = datetime.now()
        
        # For older tweets, we might need to use the full archive search (requires academic access)
        # This implementation uses recent search (last 7 days) due to API limitations
        # For full historical data, you'll need Academic Research access
        
        tweets = []
        max_results = min(count, 100)  # Max 100 per request
        
        response = client.search_recent_tweets(
            query=query,
            max_results=max_results,
            tweet_fields=['created_at', 'public_metrics'],
            user_fields=['username', 'name', 'profile_image_url'],
            expansions=['author_id'],
            sort_order='relevancy'
        )
        
        if not response.data:
            return []
            
        # Get users data
        users = {user.id: user for user in response.includes['users']}
        
        for tweet in response.data:
            user = users.get(tweet.author_id)
            if not user:
                continue
                
            # Clean the tweet text
            clean_text = clean_tweet_text(tweet.text)
            if not clean_text:
                continue
                
            # Get sentiment with more nuanced categories
            sentiment_score = sia.polarity_scores(clean_text)['compound']
            
            # Initial sentiment based on score
            # Adjusted thresholds for better negative detection
            if sentiment_score >= 0.8:
                sentiment = 'very_positive'
            elif sentiment_score >= 0.5:
                sentiment = 'positive'
            elif sentiment_score >= 0.2:
                sentiment = 'slightly_positive'
            elif sentiment_score >= -0.2:
                sentiment = 'neutral'
            elif sentiment_score >= -0.5:
                sentiment = 'slightly_negative'
            elif sentiment_score >= -0.8:
                sentiment = 'negative'
            else:
                sentiment = 'very_negative'
                
            # Enhanced list of negative words and phrases in Romanian with more context
            # Added specific phrases from the examples that indicate negative sentiment
            negative_words_ro = [
                # Price and economic issues
                'scump', 'scumpire', 'pret mare', 'preț mare', 'prețuri mari', 'scumpiri', 'scumpit',
                'devalorizare', 'inflație', 'inflației', 'scumpirea', 'scumpirile', 'scumpirilor',
                'criza energetică', 'prețul energiei', 'facturile la energie', 'facturi mari',
                'prețuri umflate', 'prețuri exagerate', 'prețuri nesimțite', 'prețuri nesimțit de mari',
                'umflă prețul', 'umflarea prețurilor', 'scumpiri nesimțite', 'scumpiri exagerate',
                
                # Dissatisfaction
                'nemulțumit', 'nemulțumire', 'nemulțumim', 'nemulțumi', 'nemulțumirea', 
                'dezamăgire', 'dezamăgitor', 'dezamăgit', 'dezamăgător',
                'dezamăgirea', 'dezamăgirii', 'dezamăgitoare', 'dezamăgitor',
                
                # Negative emotions
                'frustrare', 'frustrat', 'frustrare', 'frustrări', 'frustrărilor',
                'dezamăgire', 'dezamăgit', 'dezamăgitor', 'dezamăgirea', 'dezamăgirii',
                'supărat', 'supărare', 'supărarea', 'supărător', 'supărăciune',
                'frică', 'teamă', 'speriat', 'îngrijorat', 'îngrijorare',
                
                # Complaints
                'plângere', 'plângeri', 'plângerile', 'plângerilor',
                'reclamație', 'reclamații', 'reclamațiile', 'reclamațiilor',
                'protest', 'proteste', 'protestul', 'protestele', 'protestelor',
                'greva', 'grevă', 'grevăi', 'grevist', 'grevă',
                
                # Negative situations
                'problemă', 'probleme', 'problema', 'problemelor',
                'criză', 'criza', 'crizei', 'crize', 'crizelor',
                'dezastru', 'dezastrul', 'dezastrului', 'dezastre', 'dezastrelor',
                'catastrof', 'catastrofa', 'catastrofei', 'catastrofe', 'catastrofelor',
                
                # Negative qualities
                'proastă', 'prost', 'proștii', 'proștie', 'prostie', 'prostesc',
                'rău', 'răuvoitor', 'răutate', 'răutăcios', 'răutăciune',
                'incompetent', 'incompetență', 'incompetența', 'incompetenței',
                'incompetenta', 'incompetentei', 'incompetențe', 'incompetențelor',
                
                # Fraud and corruption
                'fraudă', 'frauda', 'fraudei', 'fraude', 'fraudelor',
                'corupție', 'corupția', 'corupției', 'corupt', 'corupți', 'corupților',
                'șpagă', 'șpăgi', 'șpăgari', 'șpăgarie', 'mită', 'mităi',
                
                # Injustice
                'nedreptate', 'nedreptatea', 'nedreptăți', 'nedreptățile', 'nedreptăților',
                'injustiție', 'injustiția', 'injustiții', 'injustițiile', 'injustițiilor',
                
                # Problems and shortages
                'lipsă', 'lipsa', 'lipsei', 'lipse', 'lipselor',
                'penurie', 'penuria', 'penuriei', 'penurii', 'penuriilor',
                'criză', 'criza', 'crizei', 'crize', 'crizelor',
                
                # Strong negative words and phrases
                'rușine', 'rușinea', 'rușinii', 'rușini', 'rușinilor',
                'jaf', 'jafurile', 'jafurilor', 'jaf la drumul mare', 'jaf pe față',
                'hoție', 'hoția', 'hoției', 'hoții', 'hoților', 'hoți mari',
                'escrocherie', 'escrocheria', 'escrocherii', 'escrocheriile', 'escrocheriilor',
                'îngropat în datorii', 'strategie falimentară', 'compensare falimentară',
                'jocuri financiare', 'manevre financiare', 'speculă', 'speculă financiară',
                'abuz', 'abuzuri', 'abuzurile', 'abuzurilor', 'abuzurile', 'abuzurile',
                'exploatare', 'exploatare financiară', 'exploatare economică',
                'nedreptate', 'nedreptăți', 'nedreptățile', 'nedreptăților',
                'jocuri politice', 'manevre politice', 'interese politice', 'interese obscure'
            ]
            
            # Check for negative words/phrases and adjust sentiment accordingly
            clean_lower = clean_text.lower()
            negative_word_count = sum(1 for word in negative_words_ro if word in clean_lower)
            
            # Check for specific negative patterns from examples
            negative_patterns = [
                'îngropată în datorii',
                'strategie falimentară',
                'compensare falimentară',
                'jaf la drumul mare',
                'umflă prețul energiei',
                'abuzuri financiare',
                'speculă cu energia',
                'exploatare financiară'
            ]
            
            strong_negative_found = any(pattern in clean_lower for pattern in negative_patterns)
            
            # Adjust sentiment based on negative words and patterns
            if strong_negative_found:
                sentiment = 'very_negative'
            elif negative_word_count > 0:
                if negative_word_count >= 2:  # Multiple negative words
                    if sentiment in ['slightly_negative', 'neutral', 'slightly_positive']:
                        sentiment = 'negative' if negative_word_count < 4 else 'very_negative'
                else:  # Single negative word
                    if sentiment == 'neutral':
                        sentiment = 'slightly_negative'
                    elif sentiment == 'slightly_positive':
                        sentiment = 'neutral'
            
            # Check for strong negative phrases that should override other classifications
            strong_negative_phrases = [
                'e un dezastru', 'e o rușine', 'e o nenorocire', 'e o prostie',
                'e jaf la drumul mare', 'e o mizerie', 'e o tâmpenie',
                'e o porcărie', 'e un jaf', 'e o rușine națională', 
                'e o rușine pentru țară', 'e o rușine pentru România',
                'nu mai pot', 'nu mai rezist', 'e de tot râsul', 
                'e de tot râsul lumii', 'e o rușine', 'e o mare nedreptate',
                'e o mare prostie', 'e o mare tâmpenie', 'e o mare porcărie',
                'e o mare mizerie', 'e o mare rușine', 'e o mare nenorocire',
                'e un mare dezastru', 'e un mare jaf', 'e o mare înșelătorie',
                'e o mare escrocherie', 'e o mare minciună', 'e o mare manipulare',
                'e o mare nedreptate', 'e o mare prostie', 'e o mare tâmpenie',
                'e o mare porcărie', 'e o mare mizerie', 'e o mare rușine',
                'e o mare nenorocire', 'e un mare dezastru', 'e un mare jaf'
            ]
            
            if any(phrase in clean_lower for phrase in strong_negative_phrases):
                sentiment = 'very_negative'
            
            tweets.append({
                'id': tweet.id,
                'text': tweet.text,
                'clean_text': clean_text,
                'created_at': tweet.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'username': user.username,
                'user_name': user.name,
                'retweets': tweet.public_metrics.get('retweet_count', 0),
                'likes': tweet.public_metrics.get('like_count', 0),
                'replies': tweet.public_metrics.get('reply_count', 0),
                'sentiment': sentiment,
                'sentiment_score': sentiment_score
            })
            
            if len(tweets) >= count:
                break
                
        return tweets
        
    except Exception as e:
        print(f"Error fetching tweets: {str(e)}")
        # Return sample data if there's an error
        return []

@app.route('/api/sentiment', methods=['GET'])
def analyze_sentiment():
    keyword = request.args.get('keyword', 'energie')
    start_date = request.args.get('start_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))
    
    try:
        # Get tweets from Twitter API
        tweets = get_tweets(keyword, count=100, start_date=start_date, end_date=end_date)
        
        if not tweets:
            return jsonify({
                'error': 'Nu s-au găsit tweet-uri pentru criteriile selectate. Încercați alte cuvinte cheie sau interval de timp.'
            }), 404
        
        # Prepare time series data
        df = pd.DataFrame(tweets)
        if not df.empty and 'created_at' in df.columns and 'sentiment_score' in df.columns:
            try:
                # Convert created_at to datetime and set as index
                df['created_at'] = pd.to_datetime(df['created_at'])
                
                # Create a proper time series with date as index
                time_series = df.set_index('created_at')['sentiment_score'].resample('D').mean()
                
                # Convert to list of dictionaries with date and score
                time_series_data = [{
                    'date': date.strftime('%Y-%m-%d'),
                    'score': float(score)  # Ensure score is serializable
                } for date, score in time_series.items()]
            except Exception as e:
                print(f"Error processing time series: {str(e)}")
                time_series_data = []
        else:
            time_series_data = []
            print("No valid data available for time series")
        
        # Create sentiment distribution with all possible categories
        sentiment_categories = ['very_positive', 'positive', 'slightly_positive', 
                              'neutral', 'slightly_negative', 'negative', 'very_negative']
        
        # Ensure all categories are present in the distribution
        sentiment_counts = df['sentiment'].value_counts()
        sentiment_dist = []
        
        for category in sentiment_categories:
            count = sentiment_counts.get(category, 0)
            sentiment_dist.append({
                'sentiment': category,
                'count': int(count)  # Convert numpy.int64 to Python int for JSON serialization
            })
        
        # Generate word cloud from clean text
        text = ' '.join(tweet['clean_text'] for tweet in tweets if tweet.get('clean_text'))
        if text.strip():
            wordcloud = WordCloud(
                width=800, 
                height=400, 
                background_color='white',
                max_words=100,
                stopwords=nltk.corpus.stopwords.words('romanian')
            ).generate(text)
            img = io.BytesIO()
            wordcloud.to_image().save(img, 'PNG')
            img_str = base64.b64encode(img.getvalue()).decode()
        else:
            img_str = None
        
        # Prepare response
        response_data = {
            'time_series': time_series_data,
            'sentiment_distribution': sentiment_dist,
            'wordcloud': img_str,
            'tweets': tweets[:10],  # Return first 10 tweets
            'total_tweets': len(tweets),
            'very_positive_count': len([t for t in tweets if t['sentiment'] == 'very_positive']),
            'positive_count': len([t for t in tweets if t['sentiment'] == 'positive']),
            'slightly_positive_count': len([t for t in tweets if t['sentiment'] == 'slightly_positive']),
            'neutral_count': len([t for t in tweets if t['sentiment'] == 'neutral']),
            'slightly_negative_count': len([t for t in tweets if t['sentiment'] == 'slightly_negative']),
            'negative_count': len([t for t in tweets if t['sentiment'] == 'negative']),
            'very_negative_count': len([t for t in tweets if t['sentiment'] == 'very_negative'])
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in analyze_sentiment: {str(e)}")
        return jsonify({
            'error': f'A apărut o eroare la procesarea cererii: {str(e)}'
        }), 500

@app.route('/api/keywords', methods=['GET'])
def get_keywords():
    return jsonify({'keywords': sample_keywords})

# Serve static files
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# Serve the main HTML page
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # Create necessary directories if they don't exist
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    
    # Download required NLTK data
    nltk.download('vader_lexicon')
    nltk.download('stopwords')
    
    app.run(debug=True, host='0.0.0.0', port=5000)
