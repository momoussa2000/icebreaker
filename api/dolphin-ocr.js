const { parseWithDolphin } = require('../dolphin-ocr');
const multer = require('multer');

// Configure multer for handling image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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
    console.log('🐬 Dolphin OCR API endpoint called');

    // Handle multipart form data
    return new Promise((resolve, reject) => {
      upload.single('image')(req, res, async (err) => {
        if (err) {
          console.error('❌ File upload error:', err);
          return res.status(400).json({
            success: false,
            error: `File upload failed: ${err.message}`
          });
        }

        try {
          if (!req.file) {
            return res.status(400).json({
              success: false,
              error: 'No image file provided'
            });
          }

          const taskType = req.body.taskType || 'auto';
          console.log(`📄 Processing ${req.file.mimetype} image (${req.file.size} bytes) with task: ${taskType}`);

          // Parse document with Dolphin OCR
          const result = await parseWithDolphin(req.file.buffer, taskType);

          if (result.success) {
            console.log('✅ Dolphin OCR parsing successful');
            
            // Validate the parsed result
            const validation = validateDolphinResult(result);
            
            return res.status(200).json({
              success: true,
              ...result,
              validation,
              metadata: {
                ...result.metadata,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                originalName: req.file.originalname
              }
            });
          } else {
            console.error('❌ Dolphin OCR parsing failed:', result.error);
            return res.status(500).json({
              success: false,
              error: result.error,
              fallbackSuggestion: 'Consider using traditional OCR as fallback'
            });
          }

        } catch (error) {
          console.error('❌ Dolphin OCR API error:', error);
          return res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        }
      });
    });

  } catch (error) {
    console.error('❌ Dolphin OCR endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Validate Dolphin OCR result quality
 * @param {Object} result - Dolphin parsing result
 * @returns {Object} Validation info
 */
function validateDolphinResult(result) {
  const validation = {
    isValid: false,
    confidence: 'low',
    issues: [],
    suggestions: [],
    clientCount: 0,
    hasArabicText: false,
    hasStructuredData: false
  };

  if (!result.success) {
    validation.issues.push('OCR parsing failed');
    return validation;
  }

  // Check for structured data
  const clientCount = result.structured?.clients?.length || 0;
  validation.clientCount = clientCount;
  validation.hasStructuredData = clientCount > 0;

  if (clientCount === 0) {
    validation.issues.push('No clients detected in structured output');
    validation.suggestions.push('Check image quality and document format');
  } else if (clientCount < 3) {
    validation.confidence = 'medium';
    validation.suggestions.push('Low client count - verify document completeness');
  } else {
    validation.confidence = 'high';
    validation.isValid = true;
  }

  // Check for Arabic text
  const hasArabicText = result.rawText && /[\u0600-\u06FF]/.test(result.rawText);
  validation.hasArabicText = hasArabicText;
  
  if (!hasArabicText) {
    validation.issues.push('No Arabic text detected');
    validation.suggestions.push('Verify document contains Arabic client names');
  }

  // Check for numerical data
  const hasNumbers = result.rawText && /\d/.test(result.rawText);
  if (!hasNumbers) {
    validation.issues.push('No numerical data detected');
    validation.suggestions.push('Ensure document contains quantity information');
  }

  // Overall quality assessment
  if (validation.hasStructuredData && validation.hasArabicText && hasNumbers) {
    validation.confidence = 'high';
    validation.isValid = true;
  }

  return validation;
} 