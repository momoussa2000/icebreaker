const { loadClientList } = require('../clients');
const { analyzePlanVsDeliveryDetailed } = require('../analysis');

module.exports = async function (req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Only POST method allowed' 
    });
  }

  try {
    console.log('🔄 Serverless comparison function called');
    
    const { deliveryText, planText } = req.body || {};

    if (!deliveryText || typeof deliveryText !== 'string' || deliveryText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid deliveryText provided'
      });
    }

    if (!planText || typeof planText !== 'string' || planText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid planText provided'
      });
    }

    console.log('📱 Delivery text length:', deliveryText.length);
    console.log('📋 Plan text length:', planText.length);

    // Load client database
    const masterClientList = loadClientList();
    console.log(`📊 Loaded ${masterClientList.length} clients from database`);

    // Perform enhanced analysis
    const result = await analyzePlanVsDeliveryDetailed(planText, deliveryText, masterClientList);
    
    console.log('✅ Comparison completed successfully');

    // Return result
    return res.status(200).json({
      success: true,
      ...result,
      metadata: {
        server: 'vercel-serverless',
        timestamp: new Date().toISOString(),
        clientsLoaded: masterClientList.length
      }
    });

  } catch (error) {
    console.error('❌ Serverless comparison error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: error.stack
    });
  }
}; 