// Simple server for Enhanced Analyzer interface
const express = require('express');
const multer = require('multer');
const path = require('path');
const { analyzePlanVsDeliveryDetailed } = require('./analysis');
const { loadClientList } = require('./clients');

const app = express();
const port = 3001; // Use different port to avoid conflicts

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Enhanced Analyzer Server' });
});

// Serve enhanced analyzer
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'enhanced-analyzer.html'));
});

// Enhanced text analysis endpoint
app.post('/analyze-plan-delivery-text', async (req, res) => {
  try {
    console.log('📝 Received enhanced text analysis request');
    const { planText, deliveryText } = req.body;
    
    if (!planText || !deliveryText) {
      return res.status(400).json({
        success: false,
        error: 'Both plan and delivery text are required'
      });
    }
    
    console.log('📋 Plan text length:', planText.length);
    console.log('📦 Delivery text length:', deliveryText.length);
    
    // Load master client list
    const masterClientList = loadClientList();
    console.log('👥 Loaded', masterClientList.length, 'clients');
    
    // Perform enhanced analysis
    const result = await analyzePlanVsDeliveryDetailed(
      planText,
      deliveryText,
      masterClientList
    );
    
    console.log('✅ Analysis complete, success:', result.success);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Enhanced text analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enhanced image analysis endpoint (placeholder - OCR needs to be fixed)
app.post('/analyze-plan-delivery-images', upload.fields([
  { name: 'planImage', maxCount: 1 },
  { name: 'deliveryImage', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📸 Received image analysis request');
    
    if (!req.files || !req.files.planImage || !req.files.deliveryImage) {
      return res.status(400).json({
        success: false,
        error: 'Both plan and delivery images are required'
      });
    }
    
    // For now, return a message about OCR not being properly configured
    res.json({
      success: false,
      error: 'OCR processing needs to be configured. Please use text input instead.',
      stage: 'ocr_not_configured',
      message: 'The enhanced analysis system works perfectly with text input. OCR extraction needs to be fixed separately.'
    });
    
  } catch (error) {
    console.error('❌ Image analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log('🚀 Enhanced Analyzer Server starting...');
  console.log(`📊 Server running at http://localhost:${port}`);
  console.log('✅ Enhanced analysis system ready!');
  console.log('💡 Use text input for best results (OCR needs configuration)');
});

module.exports = app; 