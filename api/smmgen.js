/**
 * SMMFamy - Vercel Serverless API Proxy
 * Proxies requests to SMMGen API to bypass CORS
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { action, ...params } = req.body;

        // SMMGen API configuration
        const apiUrl = 'https://smmgen.com/api/v2';
        const apiKey = process.env.SMMGEN_API_KEY || 'c4bef138daa72a2bdf56ab47edb55ef5';

        // Build form data
        const formData = new URLSearchParams();
        formData.append('key', apiKey);
        formData.append('action', action);

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        });

        // Make request to SMMGen
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        const data = await response.json();

        // Return response
        res.status(200).json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch from API' });
    }
}
