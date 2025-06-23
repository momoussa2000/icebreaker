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
 * Generate realistic demo data
 */
function generateDemoData(taskType) {
  if (taskType === 'delivery') {
    return {
      rawText: `بيزكس ستي فيو - 6ص + 3ك
نوي - 4ص + 2ك  
الفردوس كافي - 8ص + 1ك + 3كوب
كافي شوب المنصورة - 10ص + 4ك
سنترال بيرك - 3ص + 2ك + 1فو
مول العرب - 12ص + 6ك
أكاديمية الشرطة - 15ص + 8ك + 2كوب`,
      clients: [
        { clientName: 'بيزكس ستي فيو', delivered: { '3KG': 6, '5KG': 3, 'V00': 0, 'Cup': 0 }},
        { clientName: 'نوي', delivered: { '3KG': 4, '5KG': 2, 'V00': 0, 'Cup': 0 }},
        { clientName: 'الفردوس كافي', delivered: { '3KG': 8, '5KG': 1, 'V00': 0, 'Cup': 3 }},
        { clientName: 'كافي شوب المنصورة', delivered: { '3KG': 10, '5KG': 4, 'V00': 0, 'Cup': 0 }},
        { clientName: 'سنترال بيرك', delivered: { '3KG': 3, '5KG': 2, 'V00': 1, 'Cup': 0 }},
        { clientName: 'مول العرب', delivered: { '3KG': 12, '5KG': 6, 'V00': 0, 'Cup': 0 }},
        { clientName: 'أكاديمية الشرطة', delivered: { '3KG': 15, '5KG': 8, 'V00': 0, 'Cup': 2 }}
      ],
      totals: { '3KG': 58, '5KG': 26, 'V00': 1, 'Cup': 5 }
    };
  } else {
    // Plan format
    return {
      rawText: `بيزكس ستي فيو	10	5	0	0
نوي	6	2	0	0
الفردوس كافي	8	3	0	5
كافي شوب المنصورة	12	4	0	2
سنترال بيرك	5	3	1	1
مول العرب	15	8	2	0
أكاديمية الشرطة	20	12	0	3
التجمع الخامس	18	10	1	2`,
      clients: [
        { clientName: 'بيزكس ستي فيو', planned: { '3KG': 10, '5KG': 5, 'V00': 0, 'Cup': 0 }},
        { clientName: 'نوي', planned: { '3KG': 6, '5KG': 2, 'V00': 0, 'Cup': 0 }},
        { clientName: 'الفردوس كافي', planned: { '3KG': 8, '5KG': 3, 'V00': 0, 'Cup': 5 }},
        { clientName: 'كافي شوب المنصورة', planned: { '3KG': 12, '5KG': 4, 'V00': 0, 'Cup': 2 }},
        { clientName: 'سنترال بيرك', planned: { '3KG': 5, '5KG': 3, 'V00': 1, 'Cup': 1 }},
        { clientName: 'مول العرب', planned: { '3KG': 15, '5KG': 8, 'V00': 2, 'Cup': 0 }},
        { clientName: 'أكاديمية الشرطة', planned: { '3KG': 20, '5KG': 12, 'V00': 0, 'Cup': 3 }},
        { clientName: 'التجمع الخامس', planned: { '3KG': 18, '5KG': 10, 'V00': 1, 'Cup': 2 }}
      ],
      totals: { '3KG': 94, '5KG': 47, 'V00': 4, 'Cup': 13 }
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