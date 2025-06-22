// Ultra-simple Vercel serverless function for delivery comparison
// Basic JavaScript only, no complex syntax

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'POST only' });
  }

  try {
    const body = req.body;
    
    if (!body) {
      return res.status(400).json({ 
        success: false, 
        error: 'No request body' 
      });
    }

    const deliveryText = body.deliveryText;
    const planText = body.planText;

    if (!deliveryText || !planText) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both deliveryText and planText are required' 
      });
    }

    // Simple parsing
    const planLines = planText.split('\n').filter(line => line.trim().length > 2);
    const deliveryLines = deliveryText.split('\n').filter(line => line.trim().length > 2);
    
    let planClients = 0;
    let deliveredClients = 0;
    
    // Count plan clients (basic tab-separated parsing)
    for (let i = 0; i < planLines.length; i++) {
      const line = planLines[i].trim();
      if (line.includes('\t') || /\d/.test(line)) {
        planClients++;
      }
    }
    
    // Count delivered clients (basic Arabic pattern matching)
    for (let i = 0; i < deliveryLines.length; i++) {
      const line = deliveryLines[i].trim();
      if (line.includes('صغير') || line.includes('كبير') || line.includes('ص') || line.includes('ك')) {
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

Note: This is a simplified analysis. Full parsing available in main app.`;

    return res.status(200).json({
      success: true,
      result: {
        formattedOutput: formattedOutput,
        summary: {
          totalPlanned: planClients,
          totalDelivered: deliveredClients,
          missed: missedClients,
          extras: 0,
          fulfillmentRate: fulfillmentRate
        },
        deliveredClients: [],
        missedClients: [],
        unplannedDeliveries: [],
        urgentFollowUps: [],
        planDate: new Date().toDateString(),
        deliveryDate: new Date().toDateString(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Processing failed',
      details: error.message || 'Unknown error'
    });
  }
} 