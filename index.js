const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { analyzeReport, analyzeTextDirectly } = require('./analysis');
const { loadClientList, addClient, getUnvisitedClients, getClientListForPrompt, importClientsFromFile, convertCsvJsonToClients } = require('./clients');
const { savePlanFromFile, savePlanFromText, compareDeliveryFromFile, compareDeliveryFromText } = require('./plan-comparison');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists (with error handling for serverless)
const uploadsDir = '/tmp/uploads';
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (error) {
  console.warn('Could not create uploads directory:', error.message);
}

// Configure multer for file uploads (use /tmp for serverless)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/tmp/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept text files and images
    if (file.mimetype.startsWith('text/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only text and image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      uploadsDir: uploadsDir
    }
  };
  res.json(health);
});

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>📊 Icebreaker Daily Report Analyzer</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .upload-section, .text-section {
                margin: 20px 0;
                padding: 20px;
                border: 2px dashed #ddd;
                border-radius: 8px;
                text-align: center;
            }
            input[type="file"], textarea {
                margin: 10px 0;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                width: 90%;
            }
            textarea {
                height: 150px;
                resize: vertical;
            }
            button {
                background-color: #007bff;
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin: 10px;
            }
            button:hover {
                background-color: #0056b3;
            }
            .result {
                margin-top: 20px;
                padding: 20px;
                background-color: #f8f9fa;
                border-radius: 5px;
                border-left: 4px solid #007bff;
            }
            .error {
                border-left-color: #dc3545;
                background-color: #f8d7da;
            }
            .loading {
                display: none;
                text-align: center;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 Icebreaker Daily Report Analyzer</h1>
            
            <div class="upload-section">
                <h3>👥 Client Database Status</h3>
                <div id="clientStats" style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p>📊 <strong>Loading client statistics...</strong></p>
                </div>
                
                <div style="text-align: center;">
                    <button type="button" onclick="viewClients()" style="background-color: #17a2b8;">View All Clients</button>
                </div>
            </div>

            <div class="upload-section">
                <h3>📋 Distribution Plan (Night Before)</h3>
                <p style="color: #666; font-size: 14px;">Upload the distribution manager's plan with orders to be fulfilled</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <h4>📁 Upload Plan File</h4>
                        <form id="planFileForm" enctype="multipart/form-data">
                            <input type="file" name="file" accept=".txt,.csv,.json,image/*" required>
                            <br>
                            <button type="submit" style="background-color: #fd7e14;">Upload Plan</button>
                        </form>
                    </div>
                    
                    <div>
                        <h4>📝 Paste Plan Text</h4>
                        <form id="planTextForm">
                            <textarea name="text" placeholder="Paste distribution plan here..." required style="height: 100px;"></textarea>
                            <br>
                            <button type="submit" style="background-color: #fd7e14;">Save Plan</button>
                        </form>
                    </div>
                </div>
            </div>

            <div class="upload-section">
                <h3>📦 Actual Delivery Report (End of Day)</h3>
                <p style="color: #666; font-size: 14px;">Upload sales rep's actual delivery report for comparison</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <h4>📁 Upload Delivery File</h4>
                        <form id="deliveryFileForm" enctype="multipart/form-data">
                            <input type="file" name="file" accept=".txt,.csv,.json,image/*" required>
                            <br>
                            <button type="submit" style="background-color: #28a745;">Upload & Compare</button>
                        </form>
                    </div>
                    
                    <div>
                        <h4>📝 Paste Delivery Text</h4>
                        <form id="deliveryTextForm">
                            <textarea name="text" placeholder="Paste actual delivery report here..." required style="height: 100px;"></textarea>
                            <br>
                            <button type="submit" style="background-color: #28a745;">Submit & Compare</button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="upload-section" style="border: 2px dashed #007bff; background-color: #f8f9ff;">
                <h3>🔄 Quick Analysis (Legacy)</h3>
                <p style="color: #666; font-size: 14px;">For single report analysis without plan comparison</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <form id="fileForm" enctype="multipart/form-data">
                            <input type="file" name="file" accept=".txt,.csv,.json,image/*" required>
                            <br>
                            <button type="submit">Quick Analyze File</button>
                        </form>
                    </div>
                    
                    <div>
                        <form id="textForm">
                            <textarea name="text" placeholder="Paste report text here..." required style="height: 80px;"></textarea>
                            <br>
                            <button type="submit">Quick Analyze Text</button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="loading" id="loading">
                <p>🔄 Analyzing report with AI...</p>
            </div>
            
            <div id="result"></div>
        </div>

        <script>
            // Load client stats on page load
            window.addEventListener('load', async () => {
                await loadClientStats();
            });



            // Plan upload handlers
            document.getElementById('planFileForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                await submitPlan('/upload-plan', formData);
            });

            document.getElementById('planTextForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const textarea = e.target.querySelector('textarea[name="text"]');
                const text = textarea.value.trim();
                
                if (!text) {
                    showError('Please paste the distribution plan text.');
                    return;
                }
                
                const formData = new URLSearchParams();
                formData.append('text', text);
                await submitPlanText('/save-plan', formData);
            });

            // Delivery upload handlers  
            document.getElementById('deliveryFileForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                await submitDelivery('/upload-delivery', formData);
            });

            document.getElementById('deliveryTextForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const textarea = e.target.querySelector('textarea[name="text"]');
                const text = textarea.value.trim();
                
                if (!text) {
                    showError('Please paste the actual delivery report text.');
                    return;
                }
                
                const formData = new URLSearchParams();
                formData.append('text', text);
                await submitDeliveryText('/submit-delivery', formData);
            });

            // Legacy quick analysis handlers
            document.getElementById('fileForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                await submitAnalysis('/upload', formData);
            });

            document.getElementById('textForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const textarea = e.target.querySelector('textarea[name="text"]');
                const text = textarea.value.trim();
                
                if (!text) {
                    document.getElementById('result').innerHTML = \`
                        <div class="result error">
                            <h3>❌ No Text Provided</h3>
                            <p>Please paste your delivery report text in the textarea.</p>
                        </div>
                    \`;
                    return;
                }
                
                // Send as URL-encoded data
                const formData = new URLSearchParams();
                formData.append('text', text);
                await submitDeliveryText('/submit-delivery', formData);
            });



            async function submitAnalysis(endpoint, formData) {
                const loadingEl = document.getElementById('loading');
                const resultEl = document.getElementById('result');
                
                loadingEl.style.display = 'block';
                resultEl.innerHTML = '';

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();
                    loadingEl.style.display = 'none';

                    if (result.success) {
                        resultEl.innerHTML = \`
                            <div class="result">
                                <h3>✅ Analysis Complete</h3>
                                <pre>\${result.analysis}</pre>
                                <small>Generated at: \${result.timestamp}</small>
                            </div>
                        \`;
                    } else {
                        resultEl.innerHTML = \`
                            <div class="result error">
                                <h3>❌ Analysis Failed</h3>
                                <p>\${result.error}</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    loadingEl.style.display = 'none';
                    resultEl.innerHTML = \`
                        <div class="result error">
                            <h3>❌ Network Error</h3>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }

            async function submitDeliveryText(endpoint, formData) {
                const loadingEl = document.getElementById('loading');
                const resultEl = document.getElementById('result');
                
                loadingEl.style.display = 'block';
                resultEl.innerHTML = '';

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: formData
                    });

                    const result = await response.json();
                    loadingEl.style.display = 'none';

                    if (result.success) {
                        resultEl.innerHTML = \`
                            <div class="result">
                                <h3>✅ Plan vs Delivery Comparison Complete</h3>
                                <pre>\${result.comparison}</pre>
                                <small>Generated at: \${result.timestamp} | Plan ID: \${result.planId}</small>
                            </div>
                        \`;
                    } else {
                        resultEl.innerHTML = \`
                            <div class="result error">
                                <h3>❌ Comparison Failed</h3>
                                <p>\${result.error}</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    loadingEl.style.display = 'none';
                    resultEl.innerHTML = \`
                        <div class="result error">
                            <h3>❌ Network Error</h3>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }



            async function loadClientStats() {
                try {
                    const response = await fetch('/clients');
                    const result = await response.json();
                    
                    const statsEl = document.getElementById('clientStats');
                    if (result.success) {
                        const freezerClients = result.clients.filter(c => c.isFreezr).length;
                        const totalClients = result.clients.length;
                        const zones = [...new Set(result.clients.map(c => c.location.split(' ')[0]))];
                        
                        statsEl.innerHTML = \`
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                                <div style="text-align: center;">
                                    <h4 style="margin: 0; color: #007bff;">📊 Total Clients</h4>
                                    <p style="margin: 5px 0; font-size: 24px; font-weight: bold;">\${totalClients}</p>
                                </div>
                                <div style="text-align: center;">
                                    <h4 style="margin: 0; color: #28a745;">🧊 Freezer Clients</h4>
                                    <p style="margin: 5px 0; font-size: 24px; font-weight: bold;">\${freezerClients}</p>
                                </div>
                                <div style="text-align: center;">
                                    <h4 style="margin: 0; color: #fd7e14;">🗺️ Coverage Zones</h4>
                                    <p style="margin: 5px 0; font-size: 24px; font-weight: bold;">\${zones.length}</p>
                                </div>
                            </div>
                            <div style="margin-top: 10px; font-size: 14px; color: #666;">
                                <strong>Key Zones:</strong> \${zones.slice(0, 5).join(', ')}\${zones.length > 5 ? '...' : ''}
                            </div>
                        \`;
                    } else {
                        statsEl.innerHTML = '<p style="color: #dc3545;">❌ Error loading client data</p>';
                    }
                } catch (error) {
                    document.getElementById('clientStats').innerHTML = '<p style="color: #dc3545;">❌ Connection error</p>';
                }
            }

            async function viewClients() {
                try {
                    const response = await fetch('/clients');
                    const result = await response.json();
                    
                    const resultEl = document.getElementById('result');
                    if (result.success) {
                        const freezerClients = result.clients.filter(c => c.isFreezr);
                        const regularClients = result.clients.filter(c => !c.isFreezr);
                        
                        let clientsHtml = '<div class="result"><h3>👥 Client Master List</h3>';
                        
                        clientsHtml += \`<h4 style="color: #28a745;">🧊 Freezer Clients (\${freezerClients.length})</h4>\`;
                        freezerClients.forEach(client => {
                            clientsHtml += \`<p><strong>\${client.name}</strong> - \${client.location} 🧊</p>\`;
                        });
                        
                        clientsHtml += \`<h4 style="color: #007bff; margin-top: 20px;">📦 Regular Clients (\${regularClients.length})</h4>\`;
                        regularClients.slice(0, 20).forEach(client => {
                            clientsHtml += \`<p><strong>\${client.name}</strong> - \${client.location}</p>\`;
                        });
                        
                        if (regularClients.length > 20) {
                            clientsHtml += \`<p><em>... and \${regularClients.length - 20} more regular clients</em></p>\`;
                        }
                        
                        clientsHtml += '</div>';
                        resultEl.innerHTML = clientsHtml;
                    }
                } catch (error) {
                    document.getElementById('result').innerHTML = \`<div class="result error"><h3>❌ Error</h3><p>\${error.message}</p></div>\`;
                }
            }



            function showError(message) {
                document.getElementById('result').innerHTML = \`
                    <div class="result error">
                        <h3>❌ Error</h3>
                        <p>\${message}</p>
                    </div>
                \`;
            }

            async function submitPlan(endpoint, formData) {
                const loadingEl = document.getElementById('loading');
                const resultEl = document.getElementById('result');
                
                loadingEl.style.display = 'block';
                resultEl.innerHTML = '';

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();
                    loadingEl.style.display = 'none';

                    if (result.success) {
                        const totalProducts = result.totalProducts || {};
                        const productSummary = Object.entries(totalProducts)
                            .map(([product, count]) => \`\${product}: \${count}\`)
                            .join(', ');
                            
                        resultEl.innerHTML = \`
                            <div class="result">
                                <h3>✅ Distribution Plan Saved</h3>
                                <p><strong>📅 Plan Date:</strong> \${result.planDate || 'Today'}</p>
                                <p><strong>👥 Clients Planned:</strong> \${result.clientCount}</p>
                                <p><strong>📦 Total Products:</strong> \${productSummary || 'No products extracted'}</p>
                                <p><em>\${result.message}</em></p>
                                <small>Saved at: \${result.timestamp}</small>
                            </div>
                        \`;
                    } else {
                        resultEl.innerHTML = \`
                            <div class="result error">
                                <h3>❌ Plan Upload Failed</h3>
                                <p>\${result.error}</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    loadingEl.style.display = 'none';
                    resultEl.innerHTML = \`
                        <div class="result error">
                            <h3>❌ Network Error</h3>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }

            async function submitPlanText(endpoint, formData) {
                const loadingEl = document.getElementById('loading');
                const resultEl = document.getElementById('result');
                
                loadingEl.style.display = 'block';
                resultEl.innerHTML = '';

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: formData
                    });

                    const result = await response.json();
                    loadingEl.style.display = 'none';

                    if (result.success) {
                        const totalProducts = result.totalProducts || {};
                        const productSummary = Object.entries(totalProducts)
                            .map(([product, count]) => \`\${product}: \${count}\`)
                            .join(', ');
                            
                        resultEl.innerHTML = \`
                            <div class="result">
                                <h3>✅ Distribution Plan Saved</h3>
                                <p><strong>📅 Plan Date:</strong> \${result.planDate || 'Today'}</p>
                                <p><strong>👥 Clients Planned:</strong> \${result.clientCount}</p>
                                <p><strong>📦 Total Products:</strong> \${productSummary || 'No products extracted'}</p>
                                <p><em>\${result.message}</em></p>
                                <small>Saved at: \${result.timestamp}</small>
                            </div>
                        \`;
                        document.querySelector('#planTextForm').reset();
                    } else {
                        resultEl.innerHTML = \`
                            <div class="result error">
                                <h3>❌ Plan Save Failed</h3>
                                <p>\${result.error}</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    loadingEl.style.display = 'none';
                    resultEl.innerHTML = \`
                        <div class="result error">
                            <h3>❌ Network Error</h3>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }

            async function submitDelivery(endpoint, formData) {
                const loadingEl = document.getElementById('loading');
                const resultEl = document.getElementById('result');
                
                loadingEl.style.display = 'block';
                resultEl.innerHTML = '';

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();
                    loadingEl.style.display = 'none';

                    if (result.success) {
                        const dateMatchIcon = result.dateMatch ? '✅' : '⚠️';
                        const dateInfo = result.dateMatch ? 
                            'Same-day analysis' : 
                            \`Cross-date analysis (Plan: \${result.planDate}, Delivery: \${result.deliveryDate})\`;
                            
                        resultEl.innerHTML = \`
                            <div class="result">
                                <h3>📊 Plan vs Actual Delivery Comparison</h3>
                                <p><strong>📅 Date Analysis:</strong> \${dateMatchIcon} \${dateInfo}</p>
                                <pre>\${result.comparison}</pre>
                                <small>Generated at: \${result.timestamp} | Plan ID: \${result.planId}</small>
                            </div>
                        \`;
                    } else {
                        resultEl.innerHTML = \`
                            <div class="result error">
                                <h3>❌ Delivery Analysis Failed</h3>
                                <p>\${result.error}</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    loadingEl.style.display = 'none';
                    resultEl.innerHTML = \`
                        <div class="result error">
                            <h3>❌ Network Error</h3>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }

            async function submitDeliveryText(endpoint, formData) {
                const loadingEl = document.getElementById('loading');
                const resultEl = document.getElementById('result');
                
                loadingEl.style.display = 'block';
                resultEl.innerHTML = '';

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: formData
                    });

                    const result = await response.json();
                    loadingEl.style.display = 'none';

                    if (result.success) {
                        const dateMatchIcon = result.dateMatch ? '✅' : '⚠️';
                        const dateInfo = result.dateMatch ? 
                            'Same-day analysis' : 
                            \`Cross-date analysis (Plan: \${result.planDate}, Delivery: \${result.deliveryDate})\`;
                            
                        resultEl.innerHTML = \`
                            <div class="result">
                                <h3>📊 Plan vs Actual Delivery Comparison</h3>
                                <p><strong>📅 Date Analysis:</strong> \${dateMatchIcon} \${dateInfo}</p>
                                <pre>\${result.comparison}</pre>
                                <small>Generated at: \${result.timestamp} | Plan ID: \${result.planId}</small>
                            </div>
                        \`;
                        document.querySelector('#deliveryTextForm').reset();
                    } else {
                        resultEl.innerHTML = \`
                            <div class="result error">
                                <h3>❌ Delivery Analysis Failed</h3>
                                <p>\${result.error}</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    loadingEl.style.display = 'none';
                    resultEl.innerHTML = \`
                        <div class="result error">
                            <h3>❌ Network Error</h3>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }
        </script>
    </body>
    </html>
  `);
});

// File upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const masterClientList = getClientListForPrompt();
    const result = await analyzeReport(filePath, masterClientList);
    
    // Clean up uploaded file after analysis
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



// Get clients endpoint
app.get('/clients', (req, res) => {
  try {
    const clients = loadClientList();
    res.json({
      success: true,
      clients: clients
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Import clients endpoint
app.post('/import-clients', upload.single('jsonFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No JSON file uploaded'
      });
    }

    const result = importClientsFromFile(req.file.path);
    
    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    if (result.success) {
              res.json({
          success: true,
          message: `Successfully imported ${result.imported} clients (${result.skipped} duplicates skipped)`
        });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Convert CSV JSON endpoint
app.post('/api/convert-csv-json', async (req, res) => {
  try {
    const result = convertCsvJsonToClients();
    res.json(result);
  } catch (error) {
    console.error('Convert error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Text analysis endpoint
app.post('/analyze-text', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('Received request body:', req.body); // Debug log
    const { text } = req.body;
    
    console.log('Extracted text:', text); // Debug log
    console.log('Text type:', typeof text); // Debug log
    console.log('Text length:', text ? text.length : 'undefined'); // Debug log
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.log('Text validation failed'); // Debug log
      return res.status(400).json({
        success: false,
        error: 'No valid text provided'
      });
    }

    // Get master client list for comparison
    const masterClientList = getClientListForPrompt();
    const result = await analyzeTextDirectly(text, masterClientList);
    res.json(result);
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Distribution plan endpoints
app.post('/upload-plan', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No plan file uploaded'
      });
    }

    const filePath = req.file.path;
    const result = await savePlanFromFile(filePath);
    
    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    res.json(result);
  } catch (error) {
    console.error('Plan upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/save-plan', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid plan text provided'
      });
    }

    const result = await savePlanFromText(text);
    res.json(result);
  } catch (error) {
    console.error('Plan save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delivery comparison endpoints
app.post('/upload-delivery', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No delivery file uploaded'
      });
    }

    const filePath = req.file.path;
    const masterClientList = getClientListForPrompt();
    const result = await compareDeliveryFromFile(filePath, masterClientList);
    
    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    res.json(result);
  } catch (error) {
    console.error('Delivery upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/submit-delivery', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid delivery text provided'
      });
    }

    const masterClientList = loadClientList();
    const result = await compareDeliveryFromText(text, masterClientList);
    res.json(result);
  } catch (error) {
    console.error('Delivery comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Icebreaker Dashboard'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Icebreaker Dashboard running on http://localhost:${PORT}`);
  console.log(`📊 Upload reports and analyze with AI`);
}); 