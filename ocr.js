const { createWorker } = require('tesseract.js');

// Extracts Arabic + English text from an image
async function extractTextFromImage(imageFile) {
  console.log('🔍 Starting OCR text extraction...');
  const worker = await createWorker('eng+ara', 1); // fast mode

  const {
    data: { text },
  } = await worker.recognize(imageFile);

  await worker.terminate();
  console.log('✅ OCR extraction complete. Text length:', text.length);
  return text;
}

// Process image file from multer upload
async function processUploadedImage(filePath) {
  try {
    console.log('📸 Processing uploaded image:', filePath);
    const extractedText = await extractTextFromImage(filePath);
    
    // Clean up the extracted text
    const cleanedText = extractedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    console.log('🧹 Cleaned text extracted from image');
    return {
      success: true,
      text: cleanedText,
      originalText: extractedText,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ OCR processing error:', error);
    return {
      success: false,
      error: 'Failed to extract text from image: ' + error.message
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