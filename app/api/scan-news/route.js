// app/api/scan-news/route.js - News Scraping Cron Job
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
  try {
    // Verify cron authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch from NewsAPI
    const response = await fetch(
      `https://newsapi.org/v2/everything?` +
      `q="counterfeit medicine" OR "fake drugs" OR "substandard medication"&` +
      `language=en&sortBy=publishedAt&` +
      `apiKey=${process.env.NEWSAPI_KEY}`
    );

    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error('NewsAPI failed');
    }

    // Process articles
    const alerts = [];
    for (const article of data.articles.slice(0, 10)) {
      const text = `${article.title} ${article.description}`.toLowerCase();
      
      // Keyword filter
      if (!text.includes('counterfeit') && !text.includes('fake') && !text.includes('substandard')) {
        continue;
      }
      
      // Extract medication
      const medications = ['amoxicillin', 'paracetamol', 'artemether', 'metformin'];
      const med = medications.find(m => text.includes(m));
      
      if (med) {
        alerts.push({
          medication_name: med.charAt(0).toUpperCase() + med.slice(1),
          location: 'East Africa',
          severity: text.includes('death') || text.includes('danger') ? 'high' : 'medium',
          source: article.source.name,
          source_url: article.url,
          description: article.description,
          published_date: new Date(article.publishedAt).toLocaleDateString(),
          affected_area: 'Regional',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }
    }

    // Save to database
    if (alerts.length > 0) {
      const { error } = await supabase
        .from('fake_news_alerts')
        .upsert(alerts, { onConflict: 'source_url' });
      
      if (error) throw error;
    }

    return Response.json({ 
      success: true, 
      processed: alerts.length 
    });
  } catch (error) {
    console.error('Cron error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
