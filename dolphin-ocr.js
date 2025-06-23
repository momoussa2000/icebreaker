// 🐬 Dolphin OCR Integration for Document Image Parsing
// Using ByteDance/Dolphin model for structured document understanding

const fs = require('fs');
const path = require('path');

/**
 * Enhanced OCR using ByteDance Dolphin model for document parsing
 * Handles structured documents like delivery plans and reports
 */
class DolphinOCR {
  constructor() {
    this.modelName = 'ByteDance/Dolphin';
    this.isInitialized = false;
    this.transformers = null;
    this.model = null;
    this.processor = null;
  }

  /**
   * Initialize the Dolphin model (lazy loading)
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🐬 Initializing ByteDance Dolphin OCR model...');
      
      // Dynamic import for transformers.js (browser/Node.js compatible)
      this.transformers = await import('@huggingface/transformers');
      
      // Load the Dolphin model and processor
      this.model = await this.transformers.VisionEncoderDecoderModel.from_pretrained(
        this.modelName,
        { 
          quantized: true, // Use quantized version for efficiency
          progress_callback: (progress) => {
            console.log(`📦 Loading model: ${(progress.progress * 100).toFixed(1)}%`);
          }
        }
      );
      
      this.processor = await this.transformers.DonutProcessor.from_pretrained(this.modelName);
      
      this.isInitialized = true;
      console.log('✅ Dolphin OCR model initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Dolphin OCR:', error);
      throw new Error(`Dolphin OCR initialization failed: ${error.message}`);
    }
  }

  /**
   * Parse document image using Dolphin OCR
   * @param {string|Buffer} imagePath - Path to image file or image buffer
   * @param {string} taskType - Type of parsing task ('plan' or 'delivery')
   * @returns {Promise<Object>} Parsed document structure
   */
  async parseDocument(imagePath, taskType = 'auto') {
    await this.initialize();

    try {
      console.log(`🔍 Parsing document with Dolphin OCR (task: ${taskType})`);
      
      // Read image file
      const imageBuffer = typeof imagePath === 'string' 
        ? fs.readFileSync(imagePath) 
        : imagePath;
      
      // Prepare task-specific prompt
      const prompt = this.getTaskPrompt(taskType);
      
      // Process image with Dolphin
      const inputs = await this.processor(imageBuffer, prompt);
      
      // Generate structured output
      const outputs = await this.model.generate(inputs.pixel_values, {
        max_length: 2048,
        num_beams: 4,
        early_stopping: true,
        do_sample: false
      });
      
      // Decode output
      const decodedText = this.processor.decode(outputs[0], {
        skip_special_tokens: true
      });
      
      // Parse structured output
      const parsedResult = this.parseStructuredOutput(decodedText, taskType);
      
      console.log('✅ Document parsing completed');
      
      return {
        success: true,
        rawText: decodedText,
        structured: parsedResult,
        taskType: taskType,
        model: 'ByteDance/Dolphin',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Dolphin OCR parsing error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get task-specific prompt for Dolphin model
   * @param {string} taskType - Type of document to parse
   * @returns {string} Formatted prompt
   */
  getTaskPrompt(taskType) {
    const prompts = {
      plan: `Parse this distribution plan document. Extract client names, quantities (3KG, 5KG, V00, Cup), and organize in table format. Focus on Arabic text recognition.`,
      
      delivery: `Parse this delivery report. Extract client names and delivered quantities. Look for Arabic text with quantity indicators like ص (small/3KG) and ك (large/5KG). Format as delivery report.`,
      
      table: `Extract table data with client information and quantity columns. Preserve Arabic text and numerical values accurately.`,
      
      auto: `Parse this document and extract all text content. Pay special attention to Arabic text, numerical values, and tabular structures.`
    };
    
    return prompts[taskType] || prompts.auto;
  }

  /**
   * Parse Dolphin's structured output into usable format
   * @param {string} rawText - Raw text from Dolphin
   * @param {string} taskType - Document type
   * @returns {Object} Structured data
   */
  parseStructuredOutput(rawText, taskType) {
    const result = {
      clients: [],
      totals: {},
      metadata: {
        taskType,
        confidence: 'high' // Dolphin typically has high confidence for structured docs
      }
    };

    try {
      // Try to parse as JSON first (Dolphin can output structured JSON)
      if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        const jsonData = JSON.parse(rawText);
        return this.normalizeJsonOutput(jsonData, taskType);
      }

      // Parse text-based output
      const lines = rawText.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        const clientData = this.extractClientFromLine(line, taskType);
        if (clientData) {
          result.clients.push(clientData);
        }
      }

      // Calculate totals
      result.totals = this.calculateTotals(result.clients);
      
    } catch (error) {
      console.warn('⚠️ Could not parse structured output, using raw text');
      result.rawText = rawText;
      result.parseError = error.message;
    }

    return result;
  }

  /**
   * Extract client data from a single line
   * @param {string} line - Text line to parse
   * @param {string} taskType - Document type
   * @returns {Object|null} Client data or null
   */
  extractClientFromLine(line, taskType) {
    // Arabic client name pattern + quantities
    const patterns = {
      plan: /([^\t]+)\t+(\d+)\t+(\d+)\t+(\d+)\t+(\d+)/,
      delivery: /([^-]+)-\s*(\d+)([صك])\s*[\+\&]*\s*(\d+)([صك])/,
      table: /([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\|]+)/
    };

    const pattern = patterns[taskType] || patterns.plan;
    const match = line.match(pattern);

    if (!match) return null;

    if (taskType === 'delivery') {
      return {
        clientName: match[1].trim(),
        delivered: {
          '3KG': match[3] === 'ص' ? parseInt(match[2]) : (match[5] === 'ص' ? parseInt(match[4]) : 0),
          '5KG': match[3] === 'ك' ? parseInt(match[2]) : (match[5] === 'ك' ? parseInt(match[4]) : 0),
          'V00': 0,
          'Cup': 0
        }
      };
    } else {
      return {
        clientName: match[1].trim(),
        planned: {
          '3KG': parseInt(match[2]) || 0,
          '5KG': parseInt(match[3]) || 0,
          'V00': parseInt(match[4]) || 0,
          'Cup': parseInt(match[5]) || 0
        }
      };
    }
  }

  /**
   * Calculate totals from client list
   * @param {Array} clients - List of client data
   * @returns {Object} Total quantities
   */
  calculateTotals(clients) {
    const totals = { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 };
    
    clients.forEach(client => {
      const quantities = client.planned || client.delivered || {};
      Object.keys(totals).forEach(key => {
        totals[key] += quantities[key] || 0;
      });
    });
    
    return totals;
  }

  /**
   * Normalize JSON output from Dolphin
   * @param {Object} jsonData - Parsed JSON data
   * @param {string} taskType - Document type
   * @returns {Object} Normalized structure
   */
  normalizeJsonOutput(jsonData, taskType) {
    // Handle various JSON structures that Dolphin might return
    if (Array.isArray(jsonData)) {
      return {
        clients: jsonData,
        totals: this.calculateTotals(jsonData),
        metadata: { taskType, source: 'json', confidence: 'high' }
      };
    }

    if (jsonData.table || jsonData.rows) {
      return {
        clients: jsonData.table || jsonData.rows,
        totals: this.calculateTotals(jsonData.table || jsonData.rows),
        metadata: { taskType, source: 'json', confidence: 'high' }
      };
    }

    return jsonData;
  }

  /**
   * Validate parsed document for quality
   * @param {Object} result - Parsed result
   * @returns {Object} Validation info
   */
  validateParsedDocument(result) {
    const validation = {
      isValid: false,
      confidence: 'low',
      issues: [],
      suggestions: []
    };

    if (!result.success) {
      validation.issues.push('OCR parsing failed');
      return validation;
    }

    const clientCount = result.structured?.clients?.length || 0;
    
    if (clientCount === 0) {
      validation.issues.push('No clients detected');
      validation.suggestions.push('Check image quality and ensure text is clearly visible');
    } else if (clientCount < 5) {
      validation.confidence = 'medium';
      validation.suggestions.push('Low client count detected, verify completeness');
    } else {
      validation.confidence = 'high';
      validation.isValid = true;
    }

    // Check for Arabic text presence
    const hasArabicText = result.rawText && /[\u0600-\u06FF]/.test(result.rawText);
    if (!hasArabicText) {
      validation.issues.push('No Arabic text detected');
      validation.suggestions.push('Verify document contains Arabic client names');
    }

    return validation;
  }
}

module.exports = {
  DolphinOCR,
  
  /**
   * Quick function to parse document with Dolphin
   * @param {string|Buffer} imagePath - Image to parse
   * @param {string} taskType - Document type ('plan' or 'delivery')
   * @returns {Promise<Object>} Parsed result
   */
  async parseWithDolphin(imagePath, taskType = 'auto') {
    const dolphin = new DolphinOCR();
    return await dolphin.parseDocument(imagePath, taskType);
  }
}; 