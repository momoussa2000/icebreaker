// Vercel serverless function - self-contained, no imports
// Last updated: 2025-01-22 15:50 - Async function with proper Vercel format

module.exports = async function (req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Simple test endpoint
    return res.status(200).json({
      success: true,
      message: 'Delivery comparison API is working',
      timestamp: new Date().toISOString(),
      method: 'POST',
      expectedBody: {
        deliveryText: 'string - WhatsApp delivery report text',
        planText: 'string - Distribution plan text'
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Only POST allowed' });
  }

  try {
    // Extract data from request body
    const { deliveryText, planText } = req.body || {};
    
    if (!deliveryText || !planText) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: deliveryText and planText'
      });
    }

    // Simple text analysis - count clients
    const planLines = planText.split('\n').filter(line => line.trim().length > 2);
    const deliveryLines = deliveryText.split('\n').filter(line => line.trim().length > 2);
    
    let planClients = 0;
    let deliveredClients = 0;
    
    // Count plan clients (lines with tabs or numbers)
    for (const line of planLines) {
      if (line.includes('\t') || /\d/.test(line)) {
        planClients++;
      }
    }
    
    // Count delivered clients (Arabic keywords)
    for (const line of deliveryLines) {
      if (line.includes('صغير') || line.includes('كبير') || 
          line.includes('ص') || line.includes('ك')) {
        deliveredClients++;
      }
    }
    
    const missedClients = Math.max(0, planClients - deliveredClients);
    const fulfillmentRate = planClients > 0 ? Math.round((deliveredClients / planClients) * 100) : 0;
    
    const formattedOutput = `📊 Plan vs Actual Delivery Comparison
📅 Date: ${new Date().toDateString()}

✅ DELIVERED CLIENTS (${deliveredClients}):
• Successfully processed ${deliveredClients} deliveries

❌ MISSED CLIENTS (${missedClients}):
• ${missedClients} clients may need follow-up

📈 SUMMARY:
• Planned clients: ${planClients}
• Delivered: ${deliveredClients}
• Missed: ${missedClients}
• Success rate: ${fulfillmentRate}%

Note: Simplified analysis for API endpoint.`;

    return res.status(200).json({
      success: true,
      result: {
        formattedOutput,
        summary: {
          totalPlanned: planClients,
          totalDelivered: deliveredClients,
          missed: missedClients,
          extras: 0,
          fulfillmentRate
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal processing error',
      details: error.message
    });
  }
}; 