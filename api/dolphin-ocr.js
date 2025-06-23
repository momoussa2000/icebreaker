// 🐬 Enhanced OCR API for Document Image Parsing
// Lightweight serverless function using Tesseract with intelligent processing

const multer = require('multer');

// Safe import with fallback
let EnhancedOCR;
try {
  const ocrModule = require('../dolphin-ocr');
  EnhancedOCR = ocrModule.EnhancedOCR;
  if (!EnhancedOCR) {
    throw new Error('EnhancedOCR class not found in module');
  }
} catch (error) {
  console.error('❌ Failed to load EnhancedOCR:', error);
  // Create a simple fallback class
  EnhancedOCR = class {
    async parseDocument(buffer, taskType) {
      return {
        success: true,
        rawText: `Sample ${taskType} document text with Arabic content:\nبيزكس ستي فيو - 10ص + 5ك\nنوي - 6ص + 2ك`,
        structured: {
          clients: [
            { clientName: 'بيزكس ستي فيو', planned: { '3KG': 10, '5KG': 5, 'V00': 0, 'Cup': 0 }},
            { clientName: 'نوي', planned: { '3KG': 6, '5KG': 2, 'V00': 0, 'Cup': 0 }}
          ],
          totals: { '3KG': 16, '5KG': 7, 'V00': 0, 'Cup': 0 },
          metadata: { taskType, confidence: 'high' }
        },
        model: 'Fallback-OCR',
        mockMode: true,
        timestamp: new Date().toISOString()
      };
    }
    
    validateParsedDocument(result) {
      return {
        isValid: true,
        confidence: 'medium',
        issues: [],
        suggestions: ['Using fallback OCR - this is demo data']
      };
    }
  };
}

// Configure multer for image uploads (serverless-friendly)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

/**
 * Enhanced OCR API endpoint for parsing document images
 */
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    // Handle file upload with proper error handling
    let uploadError = null;
    await new Promise((resolve, reject) => {
      upload.single('image')(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err);
          uploadError = err;
          resolve(); // Don't reject, handle error gracefully
        } else {
          resolve();
        }
      });
    });

    // Check for upload errors
    if (uploadError) {
      return res.status(400).json({
        success: false,
        error: `Upload failed: ${uploadError.message}`,
        code: 'UPLOAD_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Please upload an image.',
        code: 'NO_FILE',
        timestamp: new Date().toISOString()
      });
    }

    // Get task type from query or body
    const taskType = req.query.task || req.body?.task || 'auto';
    console.log(`📋 Processing ${taskType} document...`);

    // Initialize Enhanced OCR
    const enhancedOCR = new EnhancedOCR();
    
    // Parse the document using image buffer
    console.log(`📊 Image size: ${req.file.size} bytes, Type: ${req.file.mimetype}`);
    const result = await enhancedOCR.parseDocument(req.file.buffer, taskType);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Enhanced OCR parsing failed',
        code: 'OCR_FAILED',
        timestamp: new Date().toISOString()
      });
    }

    // Validate the parsed document
    const validation = enhancedOCR.validateParsedDocument(result);
    
    console.log(`✅ Enhanced OCR completed successfully`);
    console.log(`📈 Clients detected: ${result.structured?.clients?.length || 0}`);
    console.log(`🎯 Confidence: ${validation.confidence}`);

    // Return comprehensive results
    return res.status(200).json({
      success: true,
      data: {
        // Core results
        extractedText: result.rawText,
        structuredData: result.structured,
        
        // Validation and quality assessment
        validation: validation,
        
        // Metadata
        metadata: {
          model: result.model || 'Enhanced-OCR',
          taskType: taskType,
          timestamp: result.timestamp,
          mockMode: result.mockMode || false,
          imageInfo: {
            size: req.file.size,
            type: req.file.mimetype,
            filename: req.file.originalname
          },
          performance: {
            processingTime: 'N/A',
            clientsDetected: result.structured?.clients?.length || 0,
            confidence: validation.confidence
          }
        }
      },
      
      // Quick access fields for frontend
      extractedText: result.rawText, // Direct access
      clients: result.structured?.clients || [],
      totals: result.structured?.totals || {},
      confidence: validation.confidence,
      isValid: validation.isValid,
      issues: validation.issues || [],
      suggestions: validation.suggestions || [],
      mockMode: result.mockMode || false
    });

  } catch (error) {
    console.error('❌ Enhanced OCR API Error:', error);
    
    // Ensure we always return valid JSON
    return res.status(500).json({
      success: false,
      error: error.message || 'Enhanced OCR processing failed',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Export configuration for Vercel
 */
module.exports.config = {
  api: {
    bodyParser: false, // Let multer handle body parsing
  },
}; 