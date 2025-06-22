const { createWorker } = require('tesseract.js');

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;

// Flag to disable server-side OCR if it consistently fails
const DISABLE_SERVER_OCR = process.env.DISABLE_SERVER_OCR === 'true' || isServerless;

// Extracts Arabic + English text from an image
async function extractTextFromImage(imageFile) {
  // If server-side OCR is disabled, throw a clear error
  if (DISABLE_SERVER_OCR) {
    throw new Error('Server-side OCR is disabled for this environment. Please use client-side OCR instead.');
  }

  let worker;
  try {
    console.log('🔍 Starting OCR text extraction...');
    console.log('📸 Image file path:', imageFile);
    console.log('🌐 Environment:', isServerless ? 'Serverless' : 'Local');
    
    // Serverless-friendly worker configuration
    const workerOptions = {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    };

    // In serverless environments, use simpler configuration
    if (isServerless) {
      console.log('🔧 Using serverless-optimized configuration');
      worker = await createWorker('eng+ara', 1, {
        ...workerOptions,
        cacheMethod: 'none',
        gzip: false
      });
    } else {
      console.log('🔧 Using standard configuration');
      worker = await createWorker(['eng', 'ara'], 1, workerOptions);
    }
    
    console.log('👷 OCR Worker created successfully');
    
    const { data: { text } } = await worker.recognize(imageFile);
    
    console.log('✅ OCR extraction complete. Text length:', text.length);
    console.log('📝 First 100 chars:', text.substring(0, 100));
    
    return text;
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    
    // Provide more specific error messages based on common issues
    if (error.message.includes('Worker')) {
      throw new Error(`OCR Worker initialization failed: ${error.message}. This may be due to serverless environment limitations.`);
    } else if (error.message.includes('WebAssembly')) {
      throw new Error(`WebAssembly error: ${error.message}. Server may not support required OCR dependencies.`);
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error(`Network error during OCR: ${error.message}. Check internet connection for OCR models.`);
    } else {
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  } finally {
    if (worker) {
      try {
        await worker.terminate();
        console.log('👷 OCR Worker terminated');
      } catch (terminateError) {
        console.error('⚠️ Error terminating worker:', terminateError);
      }
    }
  }
}

// Process image file from multer upload
async function processUploadedImage(filePath) {
  try {
    console.log('📸 Processing uploaded image:', filePath);
    console.log('🌐 Environment check:', {
      isServerless,
      disableServerOCR: DISABLE_SERVER_OCR,
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform
    });
    
    // If server-side OCR is disabled, return a helpful message
    if (DISABLE_SERVER_OCR) {
      return {
        success: false,
        error: 'Server-side OCR is not available in this environment',
        fallback: 'client-side-ocr',
        message: 'Please use the client-side OCR feature in your browser instead',
        troubleshooting: 'The "OCR Extract" buttons in the web interface will work using your browser\'s processing power'
      };
    }
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Image file not found at: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    console.log('📏 File size:', Math.round(stats.size / 1024), 'KB');
    
    // Validate file size (Tesseract.js can struggle with very large images)
    const maxSizeKB = isServerless ? 2048 : 5120; // 2MB for serverless, 5MB for local
    if (stats.size > maxSizeKB * 1024) {
      throw new Error(`Image too large: ${Math.round(stats.size / 1024)}KB. Maximum allowed: ${maxSizeKB}KB`);
    }
    
    const extractedText = await extractTextFromImage(filePath);
    
    // Clean up the extracted text
    const cleanedText = extractedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    console.log('🧹 Cleaned text extracted from image');
    console.log('📊 Original lines:', extractedText.split('\n').length);
    console.log('📊 Cleaned lines:', cleanedText.split('\n').length);
    
    return {
      success: true,
      text: cleanedText,
      originalText: extractedText,
      timestamp: new Date().toISOString(),
      environment: isServerless ? 'serverless' : 'local'
    };
  } catch (error) {
    console.error('❌ OCR processing error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Enhanced error response for better debugging
    return {
      success: false,
      error: `Failed to extract text from image: ${error.message}`,
      details: error.stack,
      environment: isServerless ? 'serverless' : 'local',
      fallback: 'client-side-ocr',
      troubleshooting: isServerless ? 
        'In serverless environments, OCR may have limited functionality. Use the client-side OCR buttons in the web interface instead.' :
        'For local development, ensure all dependencies are properly installed.'
    };
  }
}

// Validate if extracted text looks like a distribution plan
function validatePlanText(text) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Look for patterns that suggest this is a plan table
  const hasNumbers = /\d+/.test(text);
  const hasTabularData = lines.some(line => line.includes('\t') || /\s{3,}/.test(line));
  const hasClientNames = lines.length > 2; // At least a few lines
  
  return {
    isValid: hasNumbers && hasClientNames,
    hasTabularData,
    lineCount: lines.length,
    confidence: hasNumbers && hasTabularData ? 'high' : hasClientNames ? 'medium' : 'low'
  };
}

// Validate if extracted text looks like a delivery report
function validateDeliveryText(text) {
  const arabicPattern = /[\u0600-\u06FF]/;
  const quantityPattern = /(صغير|كبير|كوب|فو|ص|ك|\d+)/;
  
  const hasArabic = arabicPattern.test(text);
  const hasQuantities = quantityPattern.test(text);
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  return {
    isValid: hasArabic && hasQuantities,
    hasArabic,
    hasQuantities,
    lineCount: lines.length,
    confidence: hasArabic && hasQuantities ? 'high' : hasArabic ? 'medium' : 'low'
  };
}

module.exports = {
  extractTextFromImage,
  processUploadedImage,
  validatePlanText,
  validateDeliveryText
}; 