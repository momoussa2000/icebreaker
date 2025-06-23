// 📦 compare-delivery-server.js  
// ✅ Standalone Express API server for plan vs delivery OCR comparison
// This is a backup server that can run independently of the main app

const express = require("express");
const bodyParser = require("body-parser");
const { loadClientList } = require("./clients");
const { compareDeliveryWithPlan } = require("./plan-comparison");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use((req, res, next) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 📮 Main API Endpoint - Uses actual comparison logic
app.post("/api/compare-delivery", async (req, res) => {
  try {
    const { deliveryText, planText } = req.body;

    console.log('🔄 Standalone server - comparison request received');
    console.log('📱 Delivery text length:', deliveryText ? deliveryText.length : 'undefined');
    console.log('📋 Plan text length:', planText ? planText.length : 'undefined');

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

    // Load the client database
    const masterClientList = loadClientList();
    console.log(`📊 Loaded ${masterClientList.length} clients from database`);

    // Use the actual comparison function
    const result = await compareDeliveryWithPlan(deliveryText, planText, masterClientList);
    
    console.log('✅ Comparison completed successfully');

    // Return the result with success flag
    res.json({
      success: true,
      ...result,
      metadata: {
        server: 'standalone',
        timestamp: new Date().toISOString(),
        clientsLoaded: masterClientList.length
      }
    });
    
  } catch (error) {
    console.error('❌ Standalone server comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      server: 'standalone'
    });
  }
});

// 🌐 Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "✅ Standalone Compare Delivery API is running",
    timestamp: new Date().toISOString(),
    server: "standalone",
    port: PORT,
    endpoints: {
      comparison: "POST /api/compare-delivery",
      health: "GET /"
    }
  });
});

// 🏥 Detailed health check
app.get("/health", (req, res) => {
  try {
    const clientList = loadClientList();
    res.json({
      status: "healthy",
      server: "standalone",
      timestamp: new Date().toISOString(),
      database: {
        clientsLoaded: clientList.length,
        hasClients: clientList.length > 0
      },
      environment: {
        nodeVersion: process.version,
        port: PORT
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Standalone Compare Delivery Server running on http://localhost:${PORT}`);
  console.log(`📊 Ready to process plan vs delivery comparisons`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  
  // Test client database loading
  try {
    const clients = loadClientList();
    console.log(`📋 Successfully loaded ${clients.length} clients from database`);
  } catch (error) {
    console.error('⚠️  Warning: Could not load client database:', error.message);
  }
}); 