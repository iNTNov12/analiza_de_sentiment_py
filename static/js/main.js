// Set default end date to today and start date to 30 days ago
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Show loading state
    showLoading(true);
    
    // Load keywords and then analyze with default values
    fetchKeywords().then(() => {
        analyzeSentiment();
    }).catch(error => {
        console.error('Error initializing app:', error);
        showError('Eroare la inițializarea aplicației. Vă rugăm reîncărcați pagina.');
        showLoading(false);
    });
});

function showLoading(show) {
    const loadingElement = document.getElementById('loadingIndicator');
    if (show) {
        if (!loadingElement) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'loadingIndicator';
            loadingDiv.className = 'loading-overlay';
            loadingDiv.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Se încarcă...</span>
                </div>
                <p class="mt-2">Se încarcă datele...</p>
            `;
            document.body.appendChild(loadingDiv);
        }
    } else if (loadingElement) {
        loadingElement.remove();
    }
}

function showError(message) {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert the alert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
}

async function fetchKeywords() {
    try {
        const response = await fetch('/api/keywords');
        if (!response.ok) {
            throw new Error('Nu s-au putut încărca cuvintele cheie');
        }
        const data = await response.json();
        
        const datalist = document.getElementById('keywords');
        datalist.innerHTML = ''; // Clear existing options
        
        data.keywords.forEach(keyword => {
            const option = document.createElement('option');
            option.value = keyword;
            datalist.appendChild(option);
        });
        
        // Set first keyword as default if not already set
        const keywordInput = document.getElementById('keyword');
        if (data.keywords.length > 0 && !keywordInput.value) {
            keywordInput.value = data.keywords[0];
        }
        
        return data.keywords;
    } catch (error) {
        console.error('Error loading keywords:', error);
        showError('Eroare la încărcarea cuvintelor cheie. Vă rugăm reîncărcați pagina.');
        return [];
    }
}

async function analyzeSentiment() {
    const keyword = document.getElementById('keyword').value.trim() || 'energie';
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
        showError('Data de început trebuie să fie înainte de data de sfârșit.');
        return;
    }
    
    // Show loading state
    showLoading(true);
    
    // Clear previous results and errors
    document.getElementById('timeSeriesChart').innerHTML = '';
    document.getElementById('sentimentPie').innerHTML = '';
    document.getElementById('wordcloud').src = '';
    document.getElementById('tweetsContainer').innerHTML = '';
    
    try {
        const response = await fetch(`/api/sentiment?keyword=${encodeURIComponent(keyword)}&start_date=${startDate}&end_date=${endDate}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Eroare la preluarea datelor de la server');
        }
        
        const data = await response.json();
        
        // Check if we got an error message
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update the UI with the new data
        updateDashboard(data);
        
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        showError(error.message || 'A apărut o eroare la analizarea sentimentelor. Vă rugăm încercați din nou.');
    } finally {
        showLoading(false);
    }
}

function updateDashboard(data) {
    // Update time series chart
    if (data.time_series && data.time_series.length > 0) {
        updateTimeSeriesChart(data.time_series);
    } else {
        document.getElementById('timeSeriesChart').innerHTML = 
            '<div class="alert alert-info">Nu există date pentru afișarea graficului de evoluție.</div>';
    }
    
    // Update sentiment pie chart
    if (data.sentiment_distribution && data.sentiment_distribution.length > 0) {
        updateSentimentPie(data.sentiment_distribution);
    } else {
        document.getElementById('sentimentPie').innerHTML = 
            '<div class="alert alert-info">Nu există date pentru distribuția sentimentelor.</div>';
    }
    
    // Update word cloud
    const wordcloudImg = document.getElementById('wordcloud');
    if (data.wordcloud) {
        wordcloudImg.src = `data:image/png;base64,${data.wordcloud}`;
        wordcloudImg.style.display = 'block';
    } else {
        wordcloudImg.style.display = 'none';
        document.querySelector('.card:has(#wordcloud)').querySelector('.card-body').innerHTML += 
            '<div class="alert alert-info">Nu s-a putut genera word cloud-ul. Încercați cu alte cuvinte cheie.</div>';
    }
    
    // Update tweets
    if (data.tweets && data.tweets.length > 0) {
        updateTweets(data.tweets);
    } else {
        document.getElementById('tweetsContainer').innerHTML = 
            '<div class="alert alert-info">Nu s-au găsit postări pentru criteriile selectate.</div>';
    }
    
    // Update summary stats
    updateSummaryStats(data);
}

function updateTimeSeriesChart(data) {
    if (!data || data.length === 0) {
        console.log('No time series data available');
        document.getElementById('timeSeriesChart').innerHTML = '<p class="text-muted">Nu există date suficiente pentru a afișa evoluția în timp.</p>';
        return;
    }
    
    try {
        // Sort data by date to ensure proper line plotting
        const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const dates = sortedData.map(item => item.date);
        const scores = sortedData.map(item => item.score);
        
        const trace = {
            x: dates,
            y: scores,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Sentiment',
            line: { color: '#4a90e2' },
            marker: { size: 8 },
            hovertemplate: 'Data: %{x}<br>Scor: %{y:.3f}<extra></extra>'
        };
        
        const layout = {
            title: 'Evoluția sentimentelor în timp',
            xaxis: { 
                title: 'Dată',
                type: 'date',
                tickformat: '%d %b %Y'
            },
            yaxis: { 
                title: 'Scor sentiment', 
                range: [-1, 1],
                tickvals: [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1],
                ticktext: ['-1 (Foarte Negativ)', '-0.75', '-0.5', '-0.25', '0 (Neutru)', '0.25', '0.5', '0.75', '1 (Foarte Pozitiv)']
            },
            showlegend: false,
            hovermode: 'closest',
            margin: { t: 40, b: 80, l: 80, r: 40 },
            height: 400
        };
        
        // Clear any existing plot
        const chartDiv = document.getElementById('timeSeriesChart');
        chartDiv.innerHTML = '';
        
        // Create new plot
        Plotly.newPlot(chartDiv, [trace], layout, {responsive: true});
        
    } catch (error) {
        console.error('Error updating time series chart:', error);
        document.getElementById('timeSeriesChart').innerHTML = 
            '<p class="text-danger">Eroare la afișarea evoluției în timp.</p>';
    }
}

function updateSentimentPie(data) {
    // Sort data by sentiment in a specific order for consistent display
    const sentimentOrder = [
        'very_positive', 'positive', 'slightly_positive', 
        'neutral', 'slightly_negative', 'negative', 'very_negative'
    ];
    
    // Sort data according to the defined order
    const sortedData = [...data].sort((a, b) => {
        return sentimentOrder.indexOf(a.sentiment) - sentimentOrder.indexOf(b.sentiment);
    });
    
    const labels = sortedData.map(item => getSentimentLabel(item.sentiment));
    const values = sortedData.map(item => item.count);
    const colors = sortedData.map(item => getSentimentColor(item.sentiment));
    
    const trace = {
        labels: labels,
        values: values,
        type: 'pie',
        marker: {
            colors: colors
        },
        textinfo: 'label+percent',
        hoverinfo: 'label+percent+value',
        textposition: 'inside',
        sort: false,  // Prevent automatic sorting
        direction: 'clockwise'
    };
    
    const layout = {
        title: 'Distribuția sentimentelor',
        showlegend: false,
        margin: { t: 30, b: 0, l: 0, r: 0 },
        height: 400
    };
    
    Plotly.newPlot('sentimentPie', [trace], layout);
}

function updateTweets(tweets) {
    const container = document.getElementById('tweetsContainer');
    container.innerHTML = '';
    
    if (!tweets || tweets.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">Nu s-au găsit postări pentru criteriile selectate.</p>';
        return;
    }
    
    // Create a header with the number of tweets
    const header = document.createElement('div');
    header.className = 'mb-3';
    header.innerHTML = `<h6>Postări recente (afișate ${tweets.length} din ${tweets.length} rezultate)</h6>`;
    container.appendChild(header);
    
    // Add each tweet
    tweets.forEach(tweet => {
        const tweetElement = document.createElement('div');
        tweetElement.className = 'tweet mb-3 p-3 border rounded';
        
        const sentimentClass = `sentiment-${tweet.sentiment}`;
        const sentimentLabel = getSentimentLabel(tweet.sentiment);
        
        // Format engagement metrics
        const engagement = [];
        if (tweet.retweets > 0) engagement.push(`♻️ ${tweet.retweets}`);
        if (tweet.likes > 0) engagement.push(`❤️ ${tweet.likes}`);
        if (tweet.replies > 0) engagement.push(`💬 ${tweet.replies}`);
        
        tweetElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <span class="tweet-username fw-bold">${tweet.user_name || 'Utilizator'}</span>
                    <span class="text-muted ms-2">@${tweet.username}</span>
                </div>
                <span class="tweet-date text-muted small">${formatDate(tweet.created_at)}</span>
            </div>
            <p class="tweet-text mb-2">${formatTweetText(tweet.text)}</p>
            <div class="d-flex justify-content-between align-items-center">
                <div class="engagement-metrics text-muted small">
                    ${engagement.join(' ')}
                </div>
                <span class="badge" style="background-color: ${getSentimentColor(tweet.sentiment)}20; color: ${getSentimentColor(tweet.sentiment)};">
                    ${sentimentLabel}
                </span>
            </div>
        `;
        
        container.appendChild(tweetElement);
    });
}

function formatTweetText(text) {
    if (!text) return '';
    
    // Convert URLs to clickable links
    let formattedText = text.replace(
        /(https?:\/\/[^\s]+)/g, 
        url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url.length > 30 ? url.substring(0, 30) + '...' : url}</a>`
    );
    
    // Convert hashtags to clickable links
    formattedText = formattedText.replace(
        /#(\w+)/g, 
        '<a href="https://twitter.com/hashtag/$1" target="_blank" rel="noopener noreferrer">#$1</a>'
    );
    
    // Convert @mentions to clickable links
    formattedText = formattedText.replace(
        /@(\w+)/g, 
        '<a href="https://twitter.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>'
    );
    
    // Preserve line breaks
    return formattedText.replace(/\n/g, '<br>');
}

function updateSummaryStats(data) {
    // Update the summary cards if they exist, or create them
    let summaryRow = document.getElementById('summaryStats');
    
    if (!summaryRow) {
        // Create the summary row if it doesn't exist
        const container = document.querySelector('.container');
        const firstCard = document.querySelector('.card');
        
        summaryRow = document.createElement('div');
        summaryRow.id = 'summaryStats';
        summaryRow.className = 'row mb-4';
        summaryRow.innerHTML = `
            <div class="col-md-2">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <h6 class="card-subtitle mb-2 text-muted">Total postări</h6>
                        <h3 class="card-title" id="totalTweets">0</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card h-100">
                    <div class="card-body text-center" style="border-top: 4px solid #1a5f1f;">
                        <h6 class="card-subtitle mb-2 text-muted">Foarte Pozitive</h6>
                        <h3 class="card-title" id="veryPositiveTweets" style="color: #1a5f1f;">0</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card h-100">
                    <div class="card-body text-center" style="border-top: 4px solid #2e7d32;">
                        <h6 class="card-subtitle mb-2 text-muted">Pozitive</h6>
                        <h3 class="card-title" id="positiveTweets" style="color: #2e7d32;">0</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card h-100">
                    <div class="card-body text-center" style="border-top: 4px solid #9e9e9e;">
                        <h6 class="card-subtitle mb-2 text-muted">Neutre</h6>
                        <h3 class="card-title" id="neutralTweets" style="color: #9e9e9e;">0</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card h-100">
                    <div class="card-body text-center" style="border-top: 4px solid #f44336;">
                        <h6 class="card-subtitle mb-2 text-muted">Negative</h6>
                        <h3 class="card-title" id="negativeTweets" style="color: #f44336;">0</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card h-100">
                    <div class="card-body text-center" style="border-top: 4px solid #c62828;">
                        <h6 class="card-subtitle mb-2 text-muted">Foarte Negative</h6>
                        <h3 class="card-title" id="veryNegativeTweets" style="color: #c62828;">0</h3>
                    </div>
                </div>
            </div>
        `;
        
        // Insert the summary row after the search card
        firstCard.parentNode.insertBefore(summaryRow, firstCard.nextSibling);
    }
    
    // Update the values
    if (data.total_tweets !== undefined) {
        document.getElementById('totalTweets').textContent = data.total_tweets.toLocaleString();
    }
    if (data.very_positive_count !== undefined) {
        document.getElementById('veryPositiveTweets').textContent = data.very_positive_count.toLocaleString();
    }
    if (data.positive_count !== undefined) {
        document.getElementById('positiveTweets').textContent = data.positive_count.toLocaleString();
    }
    if (data.slightly_positive_count !== undefined) {
        // If you want to show slightly positive in the UI, add an element for it
        const slightlyPositiveEl = document.getElementById('slightlyPositiveTweets');
        if (slightlyPositiveEl) {
            slightlyPositiveEl.textContent = data.slightly_positive_count.toLocaleString();
        }
    }
    if (data.neutral_count !== undefined) {
        document.getElementById('neutralTweets').textContent = data.neutral_count.toLocaleString();
    }
    if (data.slightly_negative_count !== undefined) {
        // If you want to show slightly negative in the UI, add an element for it
        const slightlyNegativeEl = document.getElementById('slightlyNegativeTweets');
        if (slightlyNegativeEl) {
            slightlyNegativeEl.textContent = data.slightly_negative_count.toLocaleString();
        }
    }
    if (data.negative_count !== undefined) {
        document.getElementById('negativeTweets').textContent = data.negative_count.toLocaleString();
    }
    if (data.very_negative_count !== undefined) {
        document.getElementById('veryNegativeTweets').textContent = data.very_negative_count.toLocaleString();
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('ro-RO', options);
}

function getSentimentLabel(sentiment) {
    const labels = {
        'very_positive': 'Foarte Pozitiv',
        'positive': 'Pozitiv',
        'slightly_positive': 'Ușor Pozitiv',
        'neutral': 'Neutru',
        'slightly_negative': 'Ușor Negativ',
        'negative': 'Negativ',
        'very_negative': 'Foarte Negativ'
    };
    return labels[sentiment] || sentiment;
}

function getSentimentColor(sentiment) {
    const colors = {
        'very_positive': '#1a5f1f',  // Dark green
        'positive': '#2e7d32',       // Green
        'slightly_positive': '#4caf50', // Light green
        'neutral': '#9e9e9e',        // Gray
        'slightly_negative': '#ff9800', // Orange
        'negative': '#f44336',       // Red
        'very_negative': '#c62828'   // Dark red
    };
    return colors[sentiment] || '#9e9e9e';
}
