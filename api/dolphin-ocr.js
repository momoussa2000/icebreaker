// 🔍 Enhanced OCR API for Document Image Parsing
// Simplified serverless function with minimal dependencies

/**
 * Simple OCR API that always works
 */
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to upload images.',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('🔍 Enhanced OCR API called');

    // Get task type from query
    const taskType = req.query.task || 'auto';
    console.log(`📋 Processing ${taskType} document...`);

    // Generate realistic demo data based on task type
    const demoData = generateDemoData(taskType);
    
    console.log(`✅ Enhanced OCR completed successfully (demo mode)`);
    console.log(`📈 Clients detected: ${demoData.clients.length}`);

    // Return comprehensive results
    return res.status(200).json({
      success: true,
      data: {
        extractedText: demoData.rawText,
        structuredData: {
          clients: demoData.clients,
          totals: demoData.totals,
          metadata: {
            taskType: taskType,
            confidence: 'high',
            processingMethod: 'demo-mode'
          }
        },
        validation: {
          isValid: true,
          confidence: 'high',
          issues: [],
          suggestions: ['This is demo data - upload actual images for real OCR processing']
        },
        metadata: {
          model: 'Demo-OCR',
          taskType: taskType,
          timestamp: new Date().toISOString(),
          mockMode: true,
          imageInfo: {
            size: 'demo',
            type: 'image/demo',
            filename: 'demo.png'
          },
          performance: {
            processingTime: '50ms',
            clientsDetected: demoData.clients.length,
            confidence: 'high'
          }
        }
      },
      
      // Quick access fields for frontend
      extractedText: demoData.rawText,
      clients: demoData.clients,
      totals: demoData.totals,
      confidence: 'high',
      isValid: true,
      issues: [],
      suggestions: ['This is demo data - upload actual images for real OCR processing'],
      mockMode: true
    });

  } catch (error) {
    console.error('❌ Enhanced OCR API Error:', error);
    
    // Ensure we always return valid JSON
    return res.status(200).json({
      success: false,
      error: error.message || 'Enhanced OCR processing failed',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
}

/**
 * Generate realistic demo data based on the actual report format
 */
function generateDemoData(taskType) {
  if (taskType === 'delivery') {
    return {
      rawText: `سبوتشو أركان - 12ص + 8ك
نوي - 15ص + 10ك  
زاميل - 18ص + 12ك + 2كوب
سعن فورتش بالم هيلز - 8ص + 5ك
رايت زايد - 12ص + 8ك
سعودي دريم لاند - 80ص + 60ك
سعن فورتش أركان - 8ص + 5ك
سعن فورتش كابيتال - 25ص + 15ك
فوو بفرلي هيلز - 8ص + 5ك + 30فو
فوو زايد - 5ص + 25ك
دارا جاليريا - 10ص + 8ك
سعودي زايد - 85ص + 65ك`,
      clients: [
        { clientName: 'سبوتشو أركان', delivered: { '3KG': 12, '5KG': 8, 'V00': 0, 'Cup': 0 }},
        { clientName: 'نوي', delivered: { '3KG': 15, '5KG': 10, 'V00': 0, 'Cup': 0 }},
        { clientName: 'زاميل', delivered: { '3KG': 18, '5KG': 12, 'V00': 0, 'Cup': 2 }},
        { clientName: 'سعن فورتش بالم هيلز', delivered: { '3KG': 8, '5KG': 5, 'V00': 0, 'Cup': 0 }},
        { clientName: 'رايت زايد', delivered: { '3KG': 12, '5KG': 8, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سعودي دريم لاند', delivered: { '3KG': 80, '5KG': 60, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سعن فورتش أركان', delivered: { '3KG': 8, '5KG': 5, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سعن فورتش كابيتال', delivered: { '3KG': 25, '5KG': 15, 'V00': 0, 'Cup': 0 }},
        { clientName: 'فوو بفرلي هيلز', delivered: { '3KG': 8, '5KG': 5, 'V00': 30, 'Cup': 0 }},
        { clientName: 'فوو زايد', delivered: { '3KG': 5, '5KG': 25, 'V00': 0, 'Cup': 0 }},
        { clientName: 'دارا جاليريا', delivered: { '3KG': 10, '5KG': 8, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سعودي زايد', delivered: { '3KG': 85, '5KG': 65, 'V00': 0, 'Cup': 0 }}
      ],
      totals: { '3KG': 286, '5KG': 226, 'V00': 30, 'Cup': 2 }
    };
  } else {
    // Plan format matching the uploaded report structure
    return {
      rawText: `اسم العميل	3 KG	5 KG	V00	Cup	Comment
سبوتشو أركان	15	0	0	0	
نوي	20	0	0	0	
زاميل	20	0	0	0	
سعن فورتش بالم هيلز	10	0	0	0	
رايت زايد	15	0	0	0	
سعودي دريم لاند	100	0	0	0	
سعن فورتش أركان	10	0	0	0	
سعن فورتش كابيتال	30	15	0	0	
فوو بفرلي هيلز	10	35	0	0	
فوو زايد	10	35	0	0	
دارا جاليريا	0	12	0	0	
سعودي زايد	100	0	0	0	
المجموع	110	132	50	0`,
      clients: [
        { clientName: 'سبوتشو أركان', planned: { '3KG': 15, '5KG': 0, 'V00': 0, 'Cup': 0 }},
        { clientName: 'نوي', planned: { '3KG': 20, '5KG': 0, 'V00': 0, 'Cup': 0 }},
        { clientName: 'زاميل', planned: { '3KG': 20, '5KG': 0, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سعن فورتش بالم هيلز', planned: { '3KG': 10, '5KG': 0, 'V00': 0, 'Cup': 0 }},
        { clientName: 'رايت زايد', planned: { '3KG': 15, '5KG': 0, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سعودي دريم لاند', planned: { '3KG': 100, '5KG': 0, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سعن فورتش أركان', planned: { '3KG': 10, '5KG': 0, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سعن فورتش كابيتال', planned: { '3KG': 30, '5KG': 15, 'V00': 0, 'Cup': 0 }},
        { clientName: 'فوو بفرلي هيلز', planned: { '3KG': 10, '5KG': 35, 'V00': 0, 'Cup': 0 }},
        { clientName: 'فوو زايد', planned: { '3KG': 10, '5KG': 35, 'V00': 0, 'Cup': 0 }},
        { clientName: 'دارا جاليريا', planned: { '3KG': 0, '5KG': 12, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سعودي زايد', planned: { '3KG': 100, '5KG': 0, 'V00': 0, 'Cup': 0 }}
      ],
      totals: { '3KG': 340, '5KG': 97, 'V00': 0, 'Cup': 0 }
    };
  }
}

/**
 * Export configuration for Vercel
 */
module.exports.config = {
  api: {
    bodyParser: false,
  },
}; 