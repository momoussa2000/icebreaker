// Vercel serverless function using CommonJS format
// This should be more compatible with Vercel's Node.js runtime
// Last updated: 2025-01-22 15:30 - Force cache refresh

module.exports = function handler(req, res) {
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
    const body = req.body || {};
    
    const deliveryText = body.deliveryText || '';
    const planText = body.planText || '';

    if (!deliveryText || !planText) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both deliveryText and planText are required' 
      });
    }

    // Very simple counting
    const planLines = planText.split('\n').filter(function(line) {
      return line.trim().length > 2;
    });
    
    const deliveryLines = deliveryText.split('\n').filter(function(line) {
      return line.trim().length > 2;
    });
    
    let planClients = 0;
    let deliveredClients = 0;
    
    // Count plan clients
    for (let i = 0; i < planLines.length; i++) {
      const line = planLines[i].trim();
      if (line.indexOf('\t') >= 0 || /\d/.test(line)) {
        planClients++;
      }
    }
    
    // Count delivered clients
    for (let i = 0; i < deliveryLines.length; i++) {
      const line = deliveryLines[i].trim();
      if (line.indexOf('صغير') >= 0 || line.indexOf('كبير') >= 0 || 
          line.indexOf('ص') >= 0 || line.indexOf('ك') >= 0) {
        deliveredClients++;
      }
    }
    
    const missedClients = Math.max(0, planClients - deliveredClients);
    const fulfillmentRate = planClients > 0 ? Math.round((deliveredClients / planClients) * 100) : 0;
    
    const currentDate = new Date().toDateString();
    
    const formattedOutput = 
      '📊 Plan vs Actual Delivery Comparison\n' +
      '📅 Date: ' + currentDate + '\n\n' +
      '✅ DELIVERED CLIENTS (' + deliveredClients + '):\n' +
      '• Successfully processed ' + deliveredClients + ' deliveries\n\n' +
      '❌ MISSED CLIENTS (' + missedClients + '):\n' +
      '• ' + missedClients + ' clients may need follow-up\n\n' +
      '📈 SUMMARY:\n' +
      '• Planned clients: ' + planClients + '\n' +
      '• Delivered: ' + deliveredClients + '\n' +
      '• Missed: ' + missedClients + '\n' +
      '• Success rate: ' + fulfillmentRate + '%\n\n' +
      'Note: Simplified analysis. Full parsing available in main app.';

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
        planDate: currentDate,
        deliveryDate: currentDate,
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
}; 