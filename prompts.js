function createPrompt(text, masterClientList = null) {
  let prompt = `Analyze delivery report. Extract:

1. Delivered clients (name, quantity)
2. Missed/unvisited clients`;
  
  if (masterClientList) {
    prompt += `
3. Compare with master list: ${masterClientList}
4. Identify unvisited known clients`;
  }

  prompt += `

Report: "${text}"

Format:
✅ Delivered: [Client - Quantity]
❌ Missed: [Client - Reason]  
🧊 Freezer Clients Missed: [Urgent]
🔁 Actions: [Next steps]`;

  return prompt;
}

module.exports = { createPrompt }; 