
// Clean and robust AI Features

window.aiToast = function(msg, type='info') {
    const color = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#3b82f6');
    showToast(`🤖 ${msg}`, color);
}

window.generateEmail = async function(targetId) {
    const prompt = window.prompt("What should this email be about?");
    if (!prompt) return;
    
    aiToast("Generating email...");
    try {
        const res = await fetch('http://localhost:8000/api/ai/generate-email', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({prompt: prompt})
        });
        const data = await res.json();
        if (data.error) {
            aiToast(data.error, 'error');
        } else {
            document.getElementById(targetId).value = data.html || "";
            aiToast("Email generated!", 'success');
        }
    } catch (e) {
        aiToast("Failed to reach server.", 'error');
    }
};

window.optimizeSubject = async function(targetId) {
    const el = document.getElementById(targetId);
    if (!el.value.trim()) {
        aiToast("Please enter a subject line first.", 'error');
        return;
    }
    
    aiToast("Optimizing with Spintax...");
    try {
        const res = await fetch('http://localhost:8000/api/ai/optimize-subject', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({subject: el.value})
        });
        const data = await res.json();
        if (data.error) {
            aiToast(data.error, 'error');
        } else {
            el.value = data.subject || el.value;
            aiToast("Subject optimized!", 'success');
        }
    } catch (e) {
        aiToast("Failed to reach server.", 'error');
    }
};

window.generateIcebreakers = async function(targetId) {
    const el = document.getElementById(targetId);
    if (!el.value.trim()) {
        aiToast("Please paste CSV leads first.", 'error');
        return;
    }
    
    aiToast("Generating icebreakers... Please wait.", 'info');
    try {
        const res = await fetch('http://localhost:8000/api/ai/generate-icebreakers', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({leads_csv: el.value})
        });
        const data = await res.json();
        if (data.error) {
            aiToast(data.error, 'error');
        } else {
            el.value = data.csv || el.value;
            aiToast("Icebreakers added to CSV!", 'success');
        }
    } catch (e) {
        aiToast("Failed to reach server.", 'error');
    }
};

window.runAutopilot = async function() {
    const input = document.getElementById('autopilot-input').value;
    if (!input.trim()) {
        aiToast("Please enter a link or product description!", 'error');
        return;
    }
    
    aiToast("Auto-Pilot initiated! Scraping and writing... (approx 15s)");
    try {
        const res = await fetch('http://localhost:8000/api/ai/autopilot', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({prompt: input})
        });
        const data = await res.json();
        
        if (data.error) {
            aiToast(data.error, 'error');
            return;
        }
        
        document.getElementById('inst-subject').value = data.subject_a || "";
        document.getElementById('inst-body').value = data.body_a || "";
        
        const abContainer = document.getElementById('ab-test-container');
        if (abContainer.style.display === 'none') {
            window.toggleABTest();
        }
        
        document.getElementById('inst-subject-b').value = data.subject_b || "";
        document.getElementById('inst-body-b').value = data.body_b || "";
        
        aiToast("Campaign fully generated!", 'success');
    } catch (e) {
        aiToast("Failed to run Auto-Pilot.", 'error');
    }
};
