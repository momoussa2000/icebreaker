// This function sends the extracted delivery text and saved plan text to your compare API
async function compareDeliveryWithPlan(extractedText) {
  try {
    // Get plan data from localStorage (stored as JSON object)
    const savedPlanData = localStorage.getItem('currentPlan');
    let planText = '';
    
    if (savedPlanData) {
      try {
        const planData = JSON.parse(savedPlanData);
        planText = planData.planText || planData.text || '';
      } catch (parseError) {
        console.warn('⚠️ Could not parse saved plan data:', parseError);
        // Fallback: treat as plain text
        planText = savedPlanData;
      }
    }
    
    // Check if we have both required texts
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No delivery text provided');
    }
    
    if (!planText || planText.trim().length === 0) {
      throw new Error('No saved plan found. Please upload a plan first.');
    }
    
    console.log('📱 Sending comparison request...');
    console.log('📦 Delivery text length:', extractedText.length);
    console.log('📋 Plan text length:', planText.length);

    const response = await fetch("/api/compare-delivery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deliveryText: extractedText,
        planText: planText,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || `Server error: ${response.status}`);
    }

    console.log("✅ Comparison Result:", data);
    
    // Display the result in a formatted way
    if (data.success && data.result) {
      displayComparisonResult(data.result);
    } else {
      throw new Error('Invalid response format from server');
    }
    
    return data.result;
    
  } catch (err) {
    console.error("❌ Comparison failed:", err.message);
    
    // Show user-friendly error message
    const errorContainer = document.getElementById('result') || document.getElementById('loading');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="result error">
          <h3>❌ Comparison Failed</h3>
          <p>${err.message}</p>
          ${err.message.includes('No saved plan') ? 
            '<p><strong>💡 Solution:</strong> Please upload a distribution plan first using the plan upload section above.</p>' : ''
          }
        </div>
      `;
    } else {
      alert("⚠️ Comparison failed: " + err.message);
    }
    
    throw err; // Re-throw for caller to handle if needed
  }
}

// Updated frontend function with correct localStorage access
async function compareDeliveryWithPlanFrontend(extractedText) {
  try {
    // Get plan data from localStorage (correct key and structure)
    const savedPlanData = localStorage.getItem("currentPlan");
    let planText = '';
    
    if (savedPlanData) {
      try {
        const planData = JSON.parse(savedPlanData);
        planText = planData.planText || planData.text || '';
      } catch (parseError) {
        console.warn('⚠️ Could not parse saved plan data, trying as plain text');
        planText = savedPlanData;
      }
    }
    
    if (!planText) {
      throw new Error('No saved plan found. Please upload a plan first.');
    }

    const response = await fetch("/api/compare-delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryText: extractedText,
        planText: planText,
      }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data?.error || "Unknown error");

    console.log("✅ Result:", data.result.formattedOutput);
    
    // Display result in your UI with enhanced formatting
    displayDetailedComparisonResult(data.result);
    
    return data.result;

  } catch (err) {
    console.error("❌ Failed:", err.message);
    
    // Better error display
    const errorContainer = document.getElementById('result') || document.getElementById('loading');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="result error">
          <h3>❌ Comparison Failed</h3>
          <p>${err.message}</p>
          ${err.message.includes('No saved plan') ? 
            '<p><strong>💡 Solution:</strong> Please upload a distribution plan first.</p>' : ''
          }
        </div>
      `;
    } else {
      alert("❌ Comparison failed: " + err.message);
    }
    
    throw err;
  }
}

// Enhanced display function for detailed results
function displayDetailedComparisonResult(result) {
  const resultContainer = document.getElementById('result');
  if (!resultContainer) {
    console.error('No result container found');
    return;
  }
  
  // Hide loading indicator
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
  
  // Enhanced display with summary stats
  resultContainer.innerHTML = `
    <div class="result">
      <h3>📊 Plan vs Delivery Comparison Complete</h3>
      
      <!-- Summary Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 15px 0;">
        <div style="background: #d4edda; padding: 10px; border-radius: 5px; text-align: center;">
          <strong>${result.summary.totalDelivered}</strong><br>
          <small>Delivered</small>
        </div>
        <div style="background: #f8d7da; padding: 10px; border-radius: 5px; text-align: center;">
          <strong>${result.summary.missed}</strong><br>
          <small>Missed</small>
        </div>
        <div style="background: #fff3cd; padding: 10px; border-radius: 5px; text-align: center;">
          <strong>${result.summary.extras}</strong><br>
          <small>Extra</small>
        </div>
        <div style="background: #d1ecf1; padding: 10px; border-radius: 5px; text-align: center;">
          <strong>${result.summary.fulfillmentRate}%</strong><br>
          <small>Success Rate</small>
        </div>
      </div>
      
      <!-- Detailed Report -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; font-size: 14px;">${result.formattedOutput}</pre>
      </div>
      
      <!-- Urgent Follow-ups Alert -->
      ${result.urgentFollowUps && result.urgentFollowUps.length > 0 ? `
        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="color: #721c24; margin: 0 0 10px 0;">⚠️ Urgent Follow-ups Required</h4>
          ${result.urgentFollowUps.map(client => `
            <p style="margin: 5px 0; color: #721c24;">
              🧊 <strong>${client.clientName}</strong> - Freezer client missed delivery!
            </p>
          `).join('')}
        </div>
      ` : ''}
      
      <small>Generated at: ${new Date().toLocaleString()}</small>
    </div>
  `;
  
  // Scroll to result
  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Function to display the comparison result in a formatted way
function displayComparisonResult(result) {
  const resultContainer = document.getElementById('result');
  if (!resultContainer) {
    console.error('No result container found');
    return;
  }
  
  // Hide loading indicator
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
  
  // Format and display the result (same format as existing comparison)
  resultContainer.innerHTML = `
    <div class="result">
      <h3>📊 Plan vs Delivery Comparison Complete</h3>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${result.formattedOutput || JSON.stringify(result, null, 2)}</pre>
      </div>
      <small>Generated at: ${new Date().toLocaleString()}</small>
    </div>
  `;
  
  // Scroll to result
  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Helper function to copy text to delivery form (if needed)
function copyToDeliveryForm(text) {
  const deliveryTextarea = document.querySelector('#deliveryTextForm textarea[name="text"]');
  if (deliveryTextarea) {
    deliveryTextarea.value = text;
    deliveryTextarea.scrollIntoView({ behavior: 'smooth' });
    deliveryTextarea.focus();
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    compareDeliveryWithPlan, 
    compareDeliveryWithPlanFrontend,
    displayComparisonResult, 
    displayDetailedComparisonResult,
    copyToDeliveryForm 
  };
} 