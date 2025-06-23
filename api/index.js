module.exports = async function (req, res) {
  res.setHeader('Content-Type', 'text/html');
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Icebreaker Delivery Tracker</title>
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
        h1 { color: #333; text-align: center; }
        .status { padding: 15px; margin: 15px 0; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px;
        }
        button:hover { background-color: #0056b3; }
        textarea {
            width: 100%;
            height: 100px;
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        #result {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Icebreaker Delivery Tracker</h1>
        
        <div class="status success">
            ✅ <strong>API Status:</strong> Working! Serverless function active.
        </div>
        
        <h3>📋 Plan Text</h3>
        <textarea id="planText" placeholder="Paste your distribution plan here...
Example:
بيزكس ستي فيو	10	5	0	0
نوي	6	2	0	0"></textarea>
        
        <h3>📦 Delivery Text</h3>
        <textarea id="deliveryText" placeholder="Paste your delivery report here...
Example:
بيزكس ستي فيو - 6ص + 0ك
نوي - 0ص + 2ك"></textarea>
        
        <button onclick="compareDeliveries()">🔍 Compare Deliveries</button>
        <button onclick="testAPI()">🧪 Test API</button>
        
        <div id="result"></div>
    </div>

    <script>
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
        
        async function compareDeliveries() {
            const planText = document.getElementById('planText').value.trim();
            const deliveryText = document.getElementById('deliveryText').value.trim();
            const resultDiv = document.getElementById('result');
            
            if (!planText || !deliveryText) {
                resultDiv.innerHTML = \`
                    <div class="status error">
                        <h4>❌ Missing Data</h4>
                        <p>Please enter both plan text and delivery text.</p>
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
        
        // Auto-test API on page load
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(testAPI, 1000);
        });
    </script>
</body>
</html>`;

  return res.status(200).send(html);
}; 