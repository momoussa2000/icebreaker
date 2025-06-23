// 🐬 Enhanced OCR API for Document Image Parsing
// Lightweight serverless function using Tesseract with intelligent processing

const multer = require('multer');
const { EnhancedOCR } = require('../dolphin-ocr');

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
export default async function handler(req, res) {
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
    });
  }

  try {
    console.log('🐬 Enhanced OCR API called');

    // Handle file upload
    await new Promise((resolve, reject) => {
      upload.single('image')(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Please upload an image.',
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
      throw new Error(result.error || 'Enhanced OCR parsing failed');
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
          model: 'Enhanced-Tesseract-OCR',
          taskType: taskType,
          timestamp: result.timestamp,
          imageInfo: {
            size: req.file.size,
            type: req.file.mimetype,
            filename: req.file.originalname
          },
          performance: {
            processingTime: 'N/A', // Could add timing if needed
            clientsDetected: result.structured?.clients?.length || 0,
            confidence: validation.confidence
          }
        }
      },
      
      // Quick access fields for frontend
      clients: result.structured?.clients || [],
      totals: result.structured?.totals || {},
      confidence: validation.confidence,
      isValid: validation.isValid,
      issues: validation.issues,
      suggestions: validation.suggestions
    });

  } catch (error) {
    console.error('❌ Enhanced OCR API Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Enhanced OCR processing failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Export configuration for Vercel
 */
export const config = {
  api: {
    bodyParser: false, // Let multer handle body parsing
  },
}; 