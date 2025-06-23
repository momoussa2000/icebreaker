module.exports = async function (req, res) {
  res.setHeader('Content-Type', 'text/html');
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Icebreaker Delivery Tracker with Enhanced OCR</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1000px;
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
        h1 { color: #333; text-align: center; }
        .status { padding: 15px; margin: 15px 0; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        
        .tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 2px solid #ddd;
        }
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 16px;
            border-bottom: 3px solid transparent;
        }
        .tab.active {
            border-bottom-color: #007bff;
            color: #007bff;
            font-weight: bold;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px 5px;
            font-size: 14px;
        }
        button:hover { background-color: #0056b3; }
        button.enhanced { background-color: #28a745; }
        button.enhanced:hover { background-color: #218838; }
        
        textarea {
            width: 100%;
            height: 100px;
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-family: inherit;
        }
        
        input[type="file"] {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            width: 100%;
        }
        
        #result {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        
        .upload-zone {
            border: 2px dashed #ddd;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            margin: 20px 0;
            transition: border-color 0.3s;
        }
        .upload-zone:hover {
            border-color: #28a745;
        }
        .upload-zone.drag-over {
            border-color: #28a745;
            background-color: #f0fff0;
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        
        .model-info {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #28a745;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Icebreaker Delivery Tracker</h1>
        
        <div class="status success">
            ✅ <strong>API Status:</strong> Working! Enhanced with Lightweight OCR for superior document parsing.
        </div>
        
        <div class="model-info">
            <h4>🔍 Enhanced OCR Integration</h4>
            <p>Now powered by intelligent document processing that excels at:</p>
            <ul>
                <li>📄 Structured document parsing (tables, forms)</li>
                <li>🔤 Arabic text recognition with high accuracy</li>
                <li>🧠 Intelligent pattern matching and post-processing</li>
                <li>⚡ Fast and lightweight processing optimized for Vercel</li>
            </ul>
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="switchTab('text')">💬 Text Input</button>
            <button class="tab" onclick="switchTab('enhanced')">🔍 Enhanced OCR</button>
            <button class="tab" onclick="switchTab('compare')">📊 Compare</button>
        </div>
        
        <!-- Text Input Tab -->
        <div id="text-tab" class="tab-content active">
            <div class="grid">
                <div>
                    <h3>📋 Plan Text</h3>
                    <textarea id="planText" placeholder="Paste your distribution plan here...
Example:
بيزكس ستي فيو	10	5	0	0
نوي	6	2	0	0"></textarea>
                </div>
                
                <div>
                    <h3>📦 Delivery Text</h3>
                    <textarea id="deliveryText" placeholder="Paste your delivery report here...
Example:
بيزكس ستي فيو - 6ص + 0ك
نوي - 0ص + 2ك"></textarea>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="compareDeliveries()">🔍 Compare Deliveries</button>
                <button onclick="testAPI()">🧪 Test API</button>
            </div>
        </div>
        
        <!-- Enhanced OCR Tab -->
        <div id="enhanced-tab" class="tab-content">
            <div class="grid">
                <div>
                    <h3>📋 Upload Plan Image</h3>
                    <div class="upload-zone" id="planUploadZone">
                        <p>🖼️ Drag & Drop Plan Image Here</p>
                        <p>or</p>
                        <input type="file" id="planImageInput" accept="image/*" onchange="uploadPlanImage(this.files[0])">
                    </div>
                    <button class="enhanced" onclick="document.getElementById('planImageInput').click()">
                        🔍 Select Plan Image
                    </button>
                </div>
                
                <div>
                    <h3>📦 Upload Delivery Image</h3>
                    <div class="upload-zone" id="deliveryUploadZone">
                        <p>🖼️ Drag & Drop Delivery Image Here</p>
                        <p>or</p>
                        <input type="file" id="deliveryImageInput" accept="image/*" onchange="uploadDeliveryImage(this.files[0])">
                    </div>
                    <button class="enhanced" onclick="document.getElementById('deliveryImageInput').click()">
                        🔍 Select Delivery Image
                    </button>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button class="enhanced" onclick="processWithEnhancedOCR()">🔍 Process with Enhanced OCR</button>
            </div>
        </div>
        
        <!-- Compare Tab -->
        <div id="compare-tab" class="tab-content">
            <h3>📊 Quick Comparison Tools</h3>
            <div style="text-align: center;">
                <button onclick="compareDeliveries()">🔍 Compare Current Data</button>
                <button onclick="clearAll()">🗑️ Clear All Data</button>
                <button onclick="exportResults()">📤 Export Results</button>
            </div>
        </div>
        
        <div id="result"></div>
    </div>

    <script>
        let planData = null;
        let deliveryData = null;
        
        function switchTab(tabName) {
            // Remove active class from all tabs and content
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to selected tab and content
            event.target.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
        }
        
        async function testAPI() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>🔄 Testing API...</p>';
            
            try {
                const response = await fetch('/api/test');
                const data = await response.json();
                resultDiv.innerHTML = \`
                    <div class="status success">
                        <h4>✅ API Test Successful</h4>
                        <pre>\${JSON.stringify(data, null, 2)}</pre>
                    </div>
                \`;
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="status error">
                        <h4>❌ API Test Failed</h4>
                        <p>\${error.message}</p>
                    </div>
                \`;
            }
        }
        
        async function uploadPlanImage(file) {
            if (!file) return;
            
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>🔍 Processing plan image with Enhanced OCR...</p>';
            
            try {
                const formData = new FormData();
                formData.append('image', file);
                
                const response = await fetch('/api/dolphin-ocr?task=plan', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    planData = data;
                    document.getElementById('planText').value = data.data.extractedText || data.extractedText || '';
                    
                    resultDiv.innerHTML = \`
                        <div class="status success">
                            <h4>🔍 Plan Image Processed Successfully</h4>
                            <p><strong>Clients detected:</strong> \${data.clients?.length || 0}</p>
                            <p><strong>Confidence:</strong> \${data.confidence || 'medium'}</p>
                            <p><strong>Validation:</strong> \${data.isValid ? '✅ Valid' : '⚠️ Check required'}</p>
                            \${data.issues?.length > 0 ? \`<p><strong>Issues:</strong> \${data.issues.join(', ')}</p>\` : ''}
                            <details>
                                <summary>View extracted text</summary>
                                <pre style="white-space: pre-wrap;">\${data.data?.extractedText || data.extractedText || 'No text extracted'}</pre>
                            </details>
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`
                        <div class="status error">
                            <h4>❌ Plan Image Processing Failed</h4>
                            <p>\${data.error}</p>
                        </div>
                    \`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="status error">
                        <h4>❌ Upload Failed</h4>
                        <p>\${error.message}</p>
                    </div>
                \`;
            }
        }
        
        async function uploadDeliveryImage(file) {
            if (!file) return;
            
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>🔍 Processing delivery image with Enhanced OCR...</p>';
            
            try {
                const formData = new FormData();
                formData.append('image', file);
                
                const response = await fetch('/api/dolphin-ocr?task=delivery', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    deliveryData = data;
                    document.getElementById('deliveryText').value = data.data.extractedText || data.extractedText || '';
                    
                    resultDiv.innerHTML = \`
                        <div class="status success">
                            <h4>🔍 Delivery Image Processed Successfully</h4>
                            <p><strong>Clients detected:</strong> \${data.clients?.length || 0}</p>
                            <p><strong>Confidence:</strong> \${data.confidence || 'medium'}</p>
                            <p><strong>Validation:</strong> \${data.isValid ? '✅ Valid' : '⚠️ Check required'}</p>
                            \${data.issues?.length > 0 ? \`<p><strong>Issues:</strong> \${data.issues.join(', ')}</p>\` : ''}
                            <details>
                                <summary>View extracted text</summary>
                                <pre style="white-space: pre-wrap;">\${data.data?.extractedText || data.extractedText || 'No text extracted'}</pre>
                            </details>
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`
                        <div class="status error">
                            <h4>❌ Delivery Image Processing Failed</h4>
                            <p>\${data.error}</p>
                        </div>
                    \`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="status error">
                        <h4>❌ Upload Failed</h4>
                        <p>\${error.message}</p>
                    </div>
                \`;
            }
        }
        
        async function processWithEnhancedOCR() {
            if (!planData && !deliveryData) {
                document.getElementById('result').innerHTML = \`
                    <div class="status warning">
                        <h4>⚠️ No Images Uploaded</h4>
                        <p>Please upload at least one image using Enhanced OCR first.</p>
                    </div>
                \`;
                return;
            }
            
            compareDeliveries();
        }
        
        async function compareDeliveries() {
            const planText = document.getElementById('planText').value.trim();
            const deliveryText = document.getElementById('deliveryText').value.trim();
            const resultDiv = document.getElementById('result');
            
            if (!planText || !deliveryText) {
                resultDiv.innerHTML = \`
                    <div class="status error">
                        <h4>❌ Missing Data</h4>
                        <p>Please enter both plan text and delivery text, or use Enhanced OCR to extract from images.</p>
                    </div>
                \`;
                return;
            }
            
            resultDiv.innerHTML = '<p>🔄 Comparing deliveries...</p>';
            
            try {
                const response = await fetch('/api/compare-delivery', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        planText: planText,
                        deliveryText: deliveryText
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.innerHTML = \`
                        <div class="status success">
                            <h4>✅ Comparison Complete</h4>
                            \${data.metadata?.server === 'vercel-serverless' ? '<p><em>🔍 Enhanced with intelligent OCR processing</em></p>' : ''}
                            <pre style="white-space: pre-wrap; font-family: inherit;">\${data.comparison}</pre>
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`
                        <div class="status error">
                            <h4>❌ Comparison Failed</h4>
                            <p>\${data.error}</p>
                        </div>
                    \`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="status error">
                        <h4>❌ Request Failed</h4>
                        <p>\${error.message}</p>
                    </div>
                \`;
            }
        }
        
        function clearAll() {
            document.getElementById('planText').value = '';
            document.getElementById('deliveryText').value = '';
            document.getElementById('planImageInput').value = '';
            document.getElementById('deliveryImageInput').value = '';
            document.getElementById('result').innerHTML = '';
            planData = null;
            deliveryData = null;
        }
        
        function exportResults() {
            const result = document.getElementById('result').textContent;
            if (!result) {
                alert('No results to export. Please run a comparison first.');
                return;
            }
            
            const blob = new Blob([result], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`icebreaker-comparison-\${new Date().toISOString().split('T')[0]}.txt\`;
            a.click();
            URL.revokeObjectURL(url);
        }
        
        // Setup drag and drop
        ['planUploadZone', 'deliveryUploadZone'].forEach(zoneId => {
            const zone = document.getElementById(zoneId);
            if (!zone) return;
            
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
            
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    if (zoneId === 'planUploadZone') {
                        uploadPlanImage(files[0]);
                    } else {
                        uploadDeliveryImage(files[0]);
                    }
                }
            });
        });
        
        // Auto-test API on page load
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(testAPI, 1000);
        });
    </script>
</body>
</html>`;

  return res.status(200).send(html);
}; 