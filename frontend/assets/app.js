// ============================================================
// app.js - Main Application Logic
// Auth is handled in index.html (inline) - NOT here
// ============================================================

const API_URL = '/api';

// Get token from localStorage
function getToken() {
    try { return localStorage.getItem('token'); } catch(e) { return null; }
}

// API helper
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const headers = { 'Authorization': `Bearer ${token}` };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });
    if (res.status === 401) {
        try { localStorage.removeItem('token'); localStorage.removeItem('is_admin'); } catch(e) {}
        location.reload();
        throw new Error('Unauthorized');
    }
    return res;
}

// Toast notification
function showToast(message, type) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');
    if (!toast || !msg) return;
    msg.textContent = message;
    toast.style.background = type === 'error' ? '#dc2626' : '#1e293b';
    toast.style.bottom = '24px';
    setTimeout(() => { toast.style.bottom = '-100px'; }, 3000);
}

// ============================================================
// APP INIT - called after successful login
// ============================================================
window.APP_INIT = function() {
    fetchDashboard();
    setupNavigation();
    setupLogout();
    // setupContacts(); removed
    setupSettings();
    setupColdMailTabs();
    setupVisualBuilderTabs();
    setupCampaignBuilder();
    setupCampaignTabs();
    setupSequenceBuilder();
    setupABTest();
    setupAdmin();
    setupAIChat();

    // Show AI chat button
    var aiBtn = document.getElementById('ai-chat-btn');
    if (aiBtn) aiBtn.style.display = 'flex';
};

// ============================================================
// NAVIGATION
// ============================================================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('#app-page .view').forEach(v => v.classList.remove('active'));
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');
            if (targetId === 'admin-view') loadAdminUsers();
            if (targetId === 'dashboard') fetchDashboard();
            if (targetId === 'cold-mail-list') renderColdMailList();
            if (targetId === 'campaigns-list') renderNewsletterList();
            if (targetId === 'sending-accounts-view' && typeof ACCOUNTS !== 'undefined') ACCOUNTS.init();
            if (targetId === 'view-campaign-details') {
                if (window.lastFetchedCampaigns && window.lastFetchedCampaigns.length > 0) {
                    populateAnalytics(window.lastFetchedCampaigns[0].id);
                }
            }
        });
    });
}

function populateAnalytics(campaignId) {
    if (!window.lastFetchedCampaigns) return;
    const c = window.lastFetchedCampaigns.find(x => x.id === campaignId);
    if (!c) return;

    document.getElementById('analytics-title').textContent = c.subject || 'Untitled Campaign';
    const statusEl = document.getElementById('analytics-status');
    const cStatus = c.status || 'Draft';
    statusEl.textContent = cStatus;
    statusEl.style.background = cStatus.toLowerCase() === 'completed' ? '#059669' : (cStatus.toLowerCase() === 'failed' ? '#dc2626' : '#333');

    // Stats calculations
    const started = c.sent_count; // sequence started = leads sent to
    const opens = c.opens;
    const clicks = c.clicks;
    const openRate = started > 0 ? ((opens / started) * 100).toFixed(1) : '0';
    const clickRate = started > 0 ? ((clicks / started) * 100).toFixed(1) : '0';
    let progress = started > 0 ? 100 : 0; // Simple progress mock based on having sent something

    document.getElementById('analytics-progress-text').textContent = progress + '%';
    document.getElementById('analytics-progress-bar').style.width = progress + '%';

    document.getElementById('analytics-seq-started').textContent = started;
    document.getElementById('analytics-open-rate').textContent = openRate + '%';
    document.getElementById('analytics-open-count').textContent = opens;
    document.getElementById('analytics-click-rate').textContent = clickRate + '%';
    document.getElementById('analytics-click-count').textContent = clicks;
}

window.viewAnalytics = function(id) {
    if (!window.lastFetchedCampaigns) return;
    const c = window.lastFetchedCampaigns.find(x => x.id === id);
    if (!c) return;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('#app-page .view').forEach(v => v.classList.remove('active'));
    
    if (c.type === 'cold_mail') {
        const navCamp = document.querySelector('.nav-item[data-target="cold-mail"]');
        if (navCamp) navCamp.classList.add('active');
        const target = document.getElementById('cold-mail');
        if (target) target.classList.add('active');
        
        switchColdTab('analytics');
        
        // Populate Cold Analytics
        const statusEl = document.getElementById('cold-analytics-status');
        const cStatus = c.status || 'Draft';
        if (statusEl) {
            statusEl.textContent = cStatus;
            statusEl.style.background = cStatus.toLowerCase() === 'completed' ? '#ecfdf5' : (cStatus.toLowerCase() === 'failed' ? '#fef2f2' : '#e0e7ff');
            statusEl.style.color = cStatus.toLowerCase() === 'completed' ? '#059669' : (cStatus.toLowerCase() === 'failed' ? '#dc2626' : '#4f46e5');
        }

        const started = c.sent_count;
        const opens = c.opens;
        const clicks = c.clicks;
        const openRate = started > 0 ? Math.round((opens / started) * 100) : 0;
        const clickRate = started > 0 ? Math.round((clicks / started) * 100) : 0;

        const setEl = (eid, val) => { const el = document.getElementById(eid); if (el) el.textContent = val; };
        setEl('cold-analytics-seq-started', started.toLocaleString());
        setEl('cold-analytics-open-rate', `${openRate}%`);
        setEl('cold-analytics-open-count', `(${opens.toLocaleString()} opens)`);
        setEl('cold-analytics-click-rate', `${clickRate}%`);
        setEl('cold-analytics-click-count', `(${clicks.toLocaleString()} clicks)`);
        
    } else {
        const target = document.getElementById('view-campaign-details');
        if (target) target.classList.add('active');
        populateAnalytics(id);
    }
};

// ============================================================
// LOGOUT
// ============================================================
function setupLogout() {
    var btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        try { localStorage.removeItem('token'); localStorage.removeItem('is_admin'); } catch(e) {}
        location.reload();
    });
}

// ============================================================
// DASHBOARD
// ============================================================
let activityChartInstance = null;

async function fetchDashboard() {
    try {
        const [cRes, aRes] = await Promise.all([
            apiCall('/campaigns'),
            apiCall('/admin/stats')
        ]);

        let totalSent = 0, totalOpens = 0, totalClicks = 0, totalReplies = 0;

        const unifiedTbody = document.querySelector('#dashboard-unified-table tbody');
        if (unifiedTbody) unifiedTbody.innerHTML = '';

        const campaigns = await cRes.json();
        window.lastFetchedCampaigns = campaigns;
        
        campaigns.forEach(c => {
            totalSent += c.sent_count;
            totalOpens += c.opens;
            totalClicks += c.clicks;
            
            const tr = document.createElement('tr');
            tr.setAttribute('data-type', c.type === 'cold_mail' ? 'cold_mail' : 'newsletter');
            
            const cStatus = c.status ? c.status.toLowerCase() : 'draft';
            let statusColor = '#64748b'; // default grey
            if (cStatus === 'completed') statusColor = '#059669'; // green
            if (cStatus === 'active' || cStatus === 'processing') statusColor = '#3b82f6'; // blue
            if (cStatus === 'failed') statusColor = '#dc2626'; // red
            
            const typeBadge = c.type === 'cold_mail' 
                ? '<span style="background:#e0e7ff;color:#4f46e5;font-size:12px;padding:4px 8px;border-radius:6px;font-weight:600;"><i class="fa-solid fa-bolt" style="margin-right:4px;"></i> Cold</span>'
                : '<span style="background:#f1f5f9;color:#475569;font-size:12px;padding:4px 8px;border-radius:6px;font-weight:600;"><i class="fa-solid fa-newspaper" style="margin-right:4px;"></i> Newsletter</span>';
                
            let progressHtml = '-';
            if (c.type === 'cold_mail') {
                const openRate = c.sent_count > 0 ? Math.round((c.opens / c.sent_count) * 100) : 0;
                progressHtml = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="flex:1; background:#f1f5f9; height:6px; border-radius:3px; overflow:hidden;">
                            <div style="background:var(--p); height:100%; width:${openRate}%"></div>
                        </div>
                        <span style="font-size:12px; color:var(--text-muted); font-weight:600;">${openRate}%</span>
                    </div>
                `;
            } else {
                progressHtml = `<span style="font-size:13px; font-weight:600;">${c.sent_count} sent</span>`;
            }

            tr.innerHTML = `
                <td style="font-weight:600; color:var(--text);">
                    ${c.subject || 'Untitled'} 
                    ${c.is_ab_test ? '<span style="background:#f3e8ff;color:#a855f7;font-size:10px;padding:2px 6px;border-radius:10px;margin-left:4px;font-weight:700;">A/B</span>' : ''}
                </td>
                <td>${typeBadge}</td>
                <td style="min-width:120px;">${progressHtml}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <div style="width:8px; height:8px; border-radius:50%; background:${statusColor};"></div>
                        <span style="font-size:13px; font-weight:600; color:${statusColor}; text-transform:capitalize;">${c.status || 'Draft'}</span>
                    </div>
                </td>
                <td>
                    <div style="display:flex; gap:6px;">
                        ${c.type === 'cold_mail' ? `<button class="btn" style="padding:6px 12px;font-size:13px;background:#f8fafc;border:1px solid var(--border);" onclick="viewAnalytics(${c.id})" title="View Analytics"><i class="fa-solid fa-chart-pie" style="color:var(--p);"></i></button>` : ''}
                        <button class="btn" style="padding:6px 12px;font-size:13px;background:#f8fafc;border:1px solid var(--border);" onclick="editCampaign(${c.id})" title="Edit"><i class="fa-solid fa-pen-to-square" style="color:#64748b;"></i></button>
                    </div>
                </td>
            `;
            
            if (unifiedTbody) unifiedTbody.appendChild(tr);
        });

        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        
        const openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
        const clickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;
        
        setEl('stat-sent', totalSent.toLocaleString());
        setEl('stat-opens', `${openRate}%`);
        setEl('stat-clicks', `${clickRate}%`);
        setEl('stat-replies', totalReplies.toLocaleString());
        
        initOrUpdateChart(campaigns);
        
    } catch(e) { console.error('Dashboard error:', e); }
}

function initOrUpdateChart(campaigns) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        
        let dailyTotal = 0;
        if (campaigns && campaigns.length > 0) {
            campaigns.forEach(c => {
                if (c.created_at) {
                    const cDate = new Date(c.created_at);
                    if (cDate.getDate() === d.getDate() && 
                        cDate.getMonth() === d.getMonth() && 
                        cDate.getFullYear() === d.getFullYear()) {
                        dailyTotal += (c.total_sent || 0);
                    }
                }
            });
        }
        data.push(dailyTotal);
    }
    
    if (activityChartInstance) {
        activityChartInstance.destroy();
    }
    
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#64748b';
        
        activityChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Emails Sent',
                    data: data,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#4f46e5',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 12,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 13 },
                        displayColors: false,
                        callbacks: {
                            label: function(context) { return context.parsed.y + ' emails'; }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false, drawBorder: false } },
                    y: { 
                        beginAtZero: true,
                        grid: { color: '#f1f5f9', borderDash: [4, 4], drawBorder: false },
                        border: { display: false }
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    }
}

// Add event listener for dashboard tabs filtering
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', e => {
        if (e.target.classList.contains('dash-tab')) {
            document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            const filter = e.target.getAttribute('data-filter');
            const rows = document.querySelectorAll('#dashboard-unified-table tbody tr');
            
            rows.forEach(row => {
                if (filter === 'all' || row.getAttribute('data-type') === filter) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
    });
});


window.editCampaign = function(id) {
    if (!window.lastFetchedCampaigns) return;
    const c = window.lastFetchedCampaigns.find(x => x.id === id);
    if (!c) return;
    
    window.currentCampaignId = id;

    if (c.type === 'cold_mail') {
        const target = document.getElementById('cold-mail-builder');
        if (target) {
            document.querySelectorAll('#app-page .view').forEach(v => v.classList.remove('active'));
            target.classList.add('active');
        }
        
        const subjectEl = document.getElementById('inst-subject');
        if (subjectEl) subjectEl.value = c.subject;
        const bodyEl = document.getElementById('inst-body');
        if (bodyEl) {
            const firstStepHtml = c.body.split('<hr>')[0] || '';
            const textContent = firstStepHtml.replace(/<[^>]+>/g, '');
            bodyEl.value = textContent;
        }
        window.switchColdTab('sequences');
        showToast('Cold Mail sequence loaded for editing');
    } else {
        const target = document.getElementById('campaigns-builder');
        if (target) {
            document.querySelectorAll('#app-page .view').forEach(v => v.classList.remove('active'));
            target.classList.add('active');
        }
        const subjectEl = document.getElementById('campaign-subject');
        if (subjectEl) subjectEl.value = c.subject;
        const canvas = document.getElementById('builder-canvas');
        if (canvas) canvas.innerHTML = c.body || '';
        window.switchVbTab('design');
        showToast('Newsletter loaded for editing');
    }
};

// ============================================================
// COLD MAIL TABS
// ============================================================
function setupColdMailTabs() {
    const tabs = document.querySelectorAll('.clean-tab[data-coldtab]');
    const contents = document.querySelectorAll('.cold-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.fontWeight = '600';
                t.style.color = 'var(--text-muted)';
                t.style.borderBottom = 'none';
            });
            // Hide contents
            contents.forEach(c => c.style.display = 'none');

            // Add active to clicked
            tab.classList.add('active');
            tab.style.fontWeight = '700';
            tab.style.color = 'var(--p)';
            tab.style.borderBottom = '3px solid var(--p)';

            // Show matching content
            const targetId = 'cold-tab-' + tab.getAttribute('data-coldtab');
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.style.display = 'block';
        });
    });
}

// ============================================================
// VISUAL BUILDER TABS
// ============================================================
window.switchVbTab = function(tabName) {
    const tabs = document.querySelectorAll('.vb-tab[data-vbtab]');
    const contents = document.querySelectorAll('.vb-tab-content');

    // Remove active styling from all tabs
    tabs.forEach(t => {
        t.classList.remove('active');
        t.style.fontWeight = '600';
        t.style.color = 'var(--text-muted)';
        t.style.borderBottom = 'none';
    });

    // Hide all contents
    contents.forEach(c => c.style.display = 'none');

    // Find the clicked tab and corresponding content
    const targetTab = document.querySelector(`.vb-tab[data-vbtab="${tabName}"]`);
    const targetContent = document.getElementById('vb-tab-' + tabName);

    // Apply active styling
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.fontWeight = '700';
        targetTab.style.color = 'var(--p)';
        targetTab.style.borderBottom = '3px solid var(--p)';
    }

    // Show content
    if (targetContent) {
        targetContent.style.display = 'block';
    }
};

function setupVisualBuilderTabs() {
    const tabs = document.querySelectorAll('.vb-tab[data-vbtab]');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            window.switchVbTab(tab.getAttribute('data-vbtab'));
        });
    });
}
// SETTINGS
// ============================================================
function setupSettings() {
    const providerSelect = document.getElementById('smtp-provider');
    if (providerSelect) {
        providerSelect.addEventListener('change', () => {
            const isInstantly = providerSelect.value === 'instantly';
            const smtpFields = document.getElementById('smtp-fields');
            const instFields = document.getElementById('instantly-fields');
            if (smtpFields) smtpFields.style.display = isInstantly ? 'none' : 'block';
            if (instFields) instFields.style.display = isInstantly ? 'block' : 'none';
        });
    }

    const saveSmtpBtn = document.getElementById('save-smtp-btn');
    if (saveSmtpBtn) {
        saveSmtpBtn.addEventListener('click', async () => {
            const provider = document.getElementById('smtp-provider').value;
            let body = { provider };
            if (provider === 'smtp') {
                body.smtp_host = document.getElementById('smtp-host').value;
                body.smtp_user = document.getElementById('smtp-user').value;
                body.smtp_pass = document.getElementById('smtp-pass').value;
                body.smtp_port = parseInt(document.getElementById('smtp-port').value);
                body.from_name = document.getElementById('smtp-from-name').value;
            } else {
                body.instantly_api_key = document.getElementById('instantly-api-key').value;
            }
            try {
                const res = await apiCall('/settings/smtp', 'POST', body);
                const data = await res.json();
                const statusEl = document.getElementById('smtp-status');
                if (statusEl) {
                    statusEl.textContent = res.ok ? 'Settings saved!' : (data.detail || 'Error');
                    statusEl.className = res.ok ? 'alert success' : 'alert error';
                    statusEl.style.display = 'block';
                }
            } catch(e) { showToast('Error saving settings', 'error'); }
        });
    }

    const testBtn = document.getElementById('test-smtp-btn');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            testBtn.textContent = 'Testing...';
            testBtn.disabled = true;
            try {
                const res = await apiCall('/settings/test-smtp', 'POST');
                const data = await res.json();
                showToast(data.message || (res.ok ? 'Connection OK!' : 'Failed'), res.ok ? 'success' : 'error');
            } catch(e) { showToast('Error testing connection', 'error'); }
            testBtn.textContent = 'Test Connection';
            testBtn.disabled = false;
        });
    }

    const saveGeminiBtn = document.getElementById('save-gemini-btn');
    if (saveGeminiBtn) {
        saveGeminiBtn.addEventListener('click', async () => {
            const geminiKey = document.getElementById('gemini-api-key').value;
            const groqKeyEl = document.getElementById('groq-api-key');
            const groqKey = groqKeyEl ? groqKeyEl.value : '';
            try {
                // Save Gemini key
                if (geminiKey) {
                    await apiCall('/settings/gemini', 'POST', { gemini_api_key: geminiKey });
                }
                // Save Groq key
                if (groqKey) {
                    await apiCall('/settings/groq', 'POST', { groq_api_key: groqKey });
                }
                const geminiStatus = document.getElementById('gemini-status');
                if (geminiStatus) {
                    geminiStatus.textContent = '✅ AI Keys saved successfully!';
                    geminiStatus.className = 'alert success';
                    geminiStatus.style.display = 'block';
                    setTimeout(() => { geminiStatus.style.display = 'none'; }, 3000);
                }
            } catch(e) { showToast('Error saving keys', 'error'); }
        });
    }

    // Load existing settings
    apiCall('/settings').then(async res => {
        if (!res.ok) return;
        const s = await res.json();
        const setVal = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
        setVal('smtp-host', s.smtp_host);
        setVal('smtp-user', s.smtp_user);
        setVal('smtp-port', s.smtp_port);
        setVal('smtp-from-name', s.from_name);
        setVal('instantly-api-key', s.instantly_api_key);
        setVal('gemini-api-key', s.gemini_api_key);
        setVal('groq-api-key', s.groq_api_key);
        if (s.provider && document.getElementById('smtp-provider')) {
            document.getElementById('smtp-provider').value = s.provider;
            if (s.provider === 'instantly') {
                const sf = document.getElementById('smtp-fields');
                const inf = document.getElementById('instantly-fields');
                if (sf) sf.style.display = 'none';
                if (inf) inf.style.display = 'block';
            }
        }
    }).catch(() => {});
}

// ============================================================
// CAMPAIGN BUILDER (Visual Drag & Drop)
// ============================================================
function setupCampaignBuilder() {
    const canvasWrapper = document.querySelector('.builder-canvas-wrapper');
    const canvas = document.getElementById('builder-canvas');
    const defaultSidebar = document.getElementById('builder-sidebar-default');
    const editSidebar = document.getElementById('builder-sidebar-edit');
    const propertyFields = document.getElementById('property-fields');
    const mcEditTitle = document.getElementById('mc-edit-title');
    if (!canvas || !canvasWrapper) return;

    window.switchMcTab = function(tab) {
        document.querySelectorAll('.mc-tab').forEach(t => {
            t.classList.remove('active');
            t.style.borderBottomColor = 'transparent';
            t.style.color = 'var(--text-muted)';
        });
        const selectedTab = document.querySelector(`.mc-tab[data-mctab="${tab}"]`);
        if(selectedTab) {
            selectedTab.classList.add('active');
            selectedTab.style.borderBottomColor = 'var(--p)';
            selectedTab.style.color = 'var(--p)';
        }
        
        document.querySelectorAll('.mc-tab-content').forEach(c => c.style.display = 'none');
        const content = document.getElementById(`mc-tab-${tab}`);
        if (content) content.style.display = 'block';
    };

    window.closeMcEdit = () => {
        if (defaultSidebar && editSidebar) {
            editSidebar.style.display = 'none';
            defaultSidebar.style.display = 'flex';
        }
        document.querySelectorAll('.email-block').forEach(b => b.classList.remove('selected'));
        selectedBlock = null;
    };

    let selectedBlock = null;
    const dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';
    let currentDropTarget = null;

    canvasWrapper.addEventListener('dragover', e => {
        e.preventDefault();
        const blocks = Array.from(canvas.querySelectorAll('.email-block'));
        if (blocks.length === 0) return;
        let closestBlock = null, closestOffset = Number.NEGATIVE_INFINITY;
        blocks.forEach(block => {
            const box = block.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            if (offset < 0 && offset > closestOffset) { closestOffset = offset; closestBlock = block; }
        });
        if (closestBlock) { canvas.insertBefore(dropIndicator, closestBlock); currentDropTarget = closestBlock; }
        else { canvas.appendChild(dropIndicator); currentDropTarget = null; }
        dropIndicator.style.display = 'block';
    });

    canvasWrapper.addEventListener('drop', e => {
        e.preventDefault();
        dropIndicator.style.display = 'none';
        const type = e.dataTransfer.getData('type');
        if (!type) return;
        window.addBlockToCanvas(type, currentDropTarget);
    });

    window.drag = e => {
        const b = e.target.closest('.draggable-block');
        if (b) e.dataTransfer.setData('type', b.getAttribute('data-type'));
    };

    window.addBlockToCanvas = (type, targetBlock = null, customContent = null) => {
        const placeholder = canvas.querySelector('.canvas-placeholder');
        if (placeholder) placeholder.remove();
        const block = document.createElement('div');
        block.className = 'email-block';
        block.setAttribute('data-type', type);
        const actions = document.createElement('div');
        actions.className = 'block-actions';
        actions.innerHTML = `
            <div class="action-btn edit" title="Edit"><i class="fa-solid fa-pencil"></i></div>
            <div class="action-btn duplicate" title="Duplicate"><i class="fa-solid fa-copy"></i></div>
            <div class="action-btn delete" title="Delete"><i class="fa-solid fa-trash"></i></div>
        `;
        block.appendChild(actions);
        const content = document.createElement('div');
        content.className = 'block-content';
        
        if (customContent) {
            content.innerHTML = customContent;
            if (type === 'text') content.setAttribute('contenteditable', 'true');
        } else {
            if (type === 'text') {
                content.innerHTML = `<p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#241C15;line-height:1.5;padding:20px;">New Text Block. Click to edit.</p>`;
                content.setAttribute('contenteditable', 'true');
            }
            else if (type === 'image') content.innerHTML = `<img src="https://via.placeholder.com/600x200?text=Your+Image" style="max-width:100%;height:auto;display:block;">`;
            else if (type === 'button') content.innerHTML = `<div style="text-align:center;padding:20px;"><a href="#" style="background:#6366f1;color:#fff;padding:12px 28px;text-decoration:none;display:inline-block;border-radius:8px;font-weight:bold;font-family:Helvetica,Arial,sans-serif;">Click Me</a></div>`;
            else if (type === 'divider') content.innerHTML = `<hr style="border:0;border-top:2px solid #E0E0DF;margin:20px 0;">`;
        }
        
        block.appendChild(content);
        if (targetBlock) canvas.insertBefore(block, targetBlock);
        else canvas.appendChild(block);
        bindBlockEvents(block);
        setTimeout(() => selectBlock(null, block), 10);
        showToast('Block added');
    };

    function bindBlockEvents(block) {
        block.addEventListener('click', e => selectBlock(e, block));
        const actions = block.querySelector('.block-actions');
        if (!actions) return;
        actions.querySelector('.edit').addEventListener('click', e => { e.stopPropagation(); selectBlock(e, block); });
        actions.querySelector('.duplicate').addEventListener('click', e => {
            e.stopPropagation();
            const clone = block.cloneNode(true);
            block.parentNode.insertBefore(clone, block.nextSibling);
            bindBlockEvents(clone);
            showToast('Block duplicated');
        });
        actions.querySelector('.delete').addEventListener('click', e => {
            e.stopPropagation();
            if (confirm('Delete this block?')) {
                block.remove();
                if (selectedBlock === block) { window.closeMcEdit(); }
                if (canvas.querySelectorAll('.email-block').length === 0) canvas.innerHTML = '<div class="canvas-placeholder" style="text-align:center;padding:60px 20px;color:var(--text-muted);border:2px dashed var(--border);border-radius:8px;"><i class="fa-solid fa-layer-group" style="font-size:32px;color:#cbd5e1;margin-bottom:16px;display:block;"></i>Drag blocks here to build your email</div>';
                showToast('Block deleted');
            }
        });
    }

    function selectBlock(event, block) {
        if (event) event.stopPropagation();
        document.querySelectorAll('.email-block').forEach(b => b.classList.remove('selected'));
        selectedBlock = block;
        block.classList.add('selected');
        
        if (defaultSidebar && editSidebar) {
            defaultSidebar.style.display = 'none';
            editSidebar.style.display = 'flex';
        }
        const type = block.getAttribute('data-type');
        const contentDiv = block.querySelector('.block-content');
        propertyFields.innerHTML = '';
        if (mcEditTitle) mcEditTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        
        if (type === 'text') {
            propertyFields.innerHTML = `<div class="form-group"><label>Text (HTML allowed)</label><textarea id="prop-text" rows="5" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:10px;font-family:monospace;">${contentDiv.innerHTML}</textarea></div>`;
        } else if (type === 'image') {
            const img = contentDiv.querySelector('img');
            propertyFields.innerHTML = `<div class="form-group"><label>Image URL</label><input type="text" id="prop-img-src" value="${img ? img.src : ''}" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;"></div>`;
        } else if (type === 'button') {
            const a = contentDiv.querySelector('a');
            propertyFields.innerHTML = `<div class="form-group"><label>Button Text</label><input type="text" id="prop-btn-text" value="${a ? a.innerText : 'Click Me'}" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;"></div><div class="form-group"><label>Button URL</label><input type="text" id="prop-btn-url" value="${a ? a.getAttribute('href') : '#'}" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;"></div>`;
        } else if (type === 'divider') {
            propertyFields.innerHTML = `<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px;">Divider has no properties.</p>`;
        }
    }

    canvasWrapper.addEventListener('click', e => {
        if (e.target === canvas || e.target === canvasWrapper) {
            window.closeMcEdit();
        }
    });

    document.querySelectorAll('.draggable-block').forEach(block => {
        block.addEventListener('click', () => window.addBlockToCanvas(block.getAttribute('data-type')));
    });

    const saveBlockBtn = document.getElementById('save-block-btn');
    if (saveBlockBtn) saveBlockBtn.addEventListener('click', () => {
        if (!selectedBlock) return;
        const type = selectedBlock.getAttribute('data-type');
        const contentDiv = selectedBlock.querySelector('.block-content');
        if (type === 'text') contentDiv.innerHTML = document.getElementById('prop-text').value;
        else if (type === 'image') { const img = contentDiv.querySelector('img'); if (img) img.src = document.getElementById('prop-img-src').value; }
        else if (type === 'button') { const a = contentDiv.querySelector('a'); if (a) { a.innerText = document.getElementById('prop-btn-text').value; a.setAttribute('href', document.getElementById('prop-btn-url').value); } }
        window.closeMcEdit();
        showToast('Changes applied');
    });

    const deleteBlockBtn = document.getElementById('delete-block-btn');
    if (deleteBlockBtn) deleteBlockBtn.addEventListener('click', () => {
        if (!selectedBlock) return;
        selectedBlock.remove();
        window.closeMcEdit();
        if (canvas.children.length === 0) canvas.innerHTML = '<div class="canvas-placeholder" style="text-align:center;padding:60px 20px;color:var(--text-muted);border:2px dashed var(--border);border-radius:8px;"><i class="fa-solid fa-layer-group" style="font-size:32px;color:#cbd5e1;margin-bottom:16px;display:block;"></i>Drag blocks here to build your email</div>';
    });

    const desktopBtn = document.getElementById('preview-desktop');
    const mobileBtn = document.getElementById('preview-mobile');
    if (desktopBtn) desktopBtn.addEventListener('click', () => { canvas.style.maxWidth = '600px'; });
    if (mobileBtn) mobileBtn.addEventListener('click', () => { canvas.style.maxWidth = '320px'; });

    const bgColor = document.getElementById('global-bg-color');
    if (bgColor) bgColor.addEventListener('input', e => { canvas.style.backgroundColor = e.target.value; });

    // Send campaign button
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) sendBtn.addEventListener('click', async () => {
        const subject = document.getElementById('campaign-subject').value;
        if (!subject) { showToast('Please enter a subject line in the Design tab.', 'error'); return; }
        const blocks = Array.from(canvas.querySelectorAll('.block-content'));
        if (blocks.length === 0) { showToast('Your email is empty! Add blocks first.', 'error'); return; }
        let rawHTML = '';
        blocks.forEach(b => rawHTML += `<tr><td style="padding:0;">${b.innerHTML}</td></tr>\n`);
        const canvasBg = canvas.style.backgroundColor || '#FFFFFF';
        const finalHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F6F6F4;font-family:Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F6F6F4;padding:20px 0;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${canvasBg};max-width:600px;width:100%;border:1px solid #E0E0DF;">
                    ${rawHTML}
                    <tr>
                        <td align="center" style="background-color:#F6F6F4;padding:20px;font-size:12px;color:#6C6D67;border-top:1px solid #E0E0DF;">
                            <p style="margin:0;">You received this email because you subscribed.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
        sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        sendBtn.disabled = true;
        try {
            const leadsText = document.getElementById('newsletter-leads').value;
            const leads = [];
            leadsText.split('\n').map(l => l.trim()).filter(l => l).forEach(line => {
                const parts = line.split(',').map(p => p.trim());
                leads.push({ email: parts[0], name: parts[1] || '', company: parts[2] || '' });
            });
            const payload = { subject, body: finalHTML, type: 'newsletter' };
            if (leads.length > 0) payload.leads = leads;
            const res = await apiCall('/campaigns/send', 'POST', payload);
            if (res.ok) {
                showToast('Campaign sent successfully!', 'success');
                canvas.innerHTML = '<div class="canvas-placeholder">Drag blocks here to build your email</div>';
                window.switchVbTab('audience');
            } else {
                const data = await res.json();
                showToast(data.detail || 'Failed to send', 'error');
            }
        } catch(e) { showToast('Error sending campaign', 'error'); }
        sendBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> Send Now';
        sendBtn.disabled = false;
    });

    // Premade templates
    const tmplSelect = document.getElementById('premade-templates');
    if (tmplSelect) tmplSelect.addEventListener('change', e => {
        const val = e.target.value;
        if (!val) return;
        canvas.innerHTML = '';
        
        const tmpl = window.EmailTemplates ? window.EmailTemplates.find(t => t.id === val) : null;
        if (tmpl) {
            const subjEl = document.getElementById('campaign-subject');
            if (subjEl) subjEl.value = tmpl.subject || '';
            
            tmpl.blocks.forEach(b => {
                window.addBlockToCanvas(b.type, null, b.content);
            });
            showToast('Template loaded');
        } else {
            showToast('Template not found', 'error');
        }
    });
}

// ============================================================
// CAMPAIGN TABS
// ============================================================
function setupCampaignTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => { c.style.display = 'none'; c.classList.remove('active'); });
            const target = document.getElementById(btn.getAttribute('data-tab'));
            if (target) { target.style.display = 'block'; target.classList.add('active'); }
        });
    });
}

// ============================================================
// SEQUENCE BUILDER
// ============================================================
function setupSequenceBuilder() {
    let steps = [{ step: 1, wait: 0, subject: '', body: '', is_ab: false, subject_b: '', body_b: '' }];
    let currentStep = 1;

    window.toggleInstAB = function() {
        const s = steps.find(x => x.step === currentStep);
        if (!s) return;
        s.is_ab = !s.is_ab;
        document.getElementById('inst-ab-section').style.display = s.is_ab ? 'block' : 'none';
        const abToggleBtn = document.getElementById('ab-toggle-btn');
        if (abToggleBtn) {
            abToggleBtn.style.color = s.is_ab ? 'var(--p)' : 'var(--text-muted)';
            abToggleBtn.style.borderColor = s.is_ab ? 'var(--p)' : 'var(--border)';
        }
        renderSteps();
    };

    function renderSteps() {
        const bar = document.getElementById('inst-steps-bar');
        if (!bar) return;
        bar.innerHTML = '';
        steps.forEach(s => {
            const btn = document.createElement('div');
            btn.className = 'btn';
            btn.innerHTML = `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;">
                <span style="font-weight:700;">Step ${s.step} ${s.is_ab ? '<i class="fa-solid fa-flask" style="font-size:10px;margin-left:4px;color:var(--p);"></i>' : ''}</span>
                <span style="font-size:12px;opacity:0.8;">Wait: ${s.wait} day(s)</span>
            </div>`;
            btn.style.cssText = 'padding:12px 16px;font-size:14px;width:100%;text-align:left;justify-content:flex-start;background:' + (s.step === currentStep ? 'var(--surface-1)' : 'transparent') + ';color:' + (s.step === currentStep ? 'var(--text)' : 'var(--text-muted)') + ';border:1px solid ' + (s.step === currentStep ? 'var(--border)' : 'transparent') + ';cursor:pointer;border-radius:8px;';
            if (s.step === currentStep) btn.style.boxShadow = 'var(--shadow-sm)';
            btn.onclick = () => { saveStep(); currentStep = s.step; loadStep(); renderSteps(); };
            bar.appendChild(btn);
        });
    }

    function saveStep() {
        const s = steps.find(x => x.step === currentStep);
        if (!s) return;
        s.subject = (document.getElementById('inst-subject') || {}).value || '';
        s.body = (document.getElementById('inst-body') || {}).value || '';
        s.wait = parseInt((document.getElementById('inst-wait') || {}).value) || 0;
        s.subject_b = (document.getElementById('inst-subject-b') || {}).value || '';
        s.body_b = (document.getElementById('inst-body-b') || {}).value || '';
    }

    function loadStep() {
        const s = steps.find(x => x.step === currentStep);
        if (!s) return;
        
        const titleEl = document.getElementById('inst-step-title');
        if (titleEl) titleEl.textContent = 'Step ' + s.step;
        
        const subj = document.getElementById('inst-subject');
        const body = document.getElementById('inst-body');
        const wait = document.getElementById('inst-wait');
        const subjB = document.getElementById('inst-subject-b');
        const bodyB = document.getElementById('inst-body-b');
        
        if (subj) subj.value = s.subject;
        if (body) body.value = s.body;
        if (wait) wait.value = s.wait;
        if (subjB) subjB.value = s.subject_b || '';
        if (bodyB) bodyB.value = s.body_b || '';
        
        document.getElementById('inst-ab-section').style.display = s.is_ab ? 'block' : 'none';
        const abToggleBtn = document.getElementById('ab-toggle-btn');
        if (abToggleBtn) {
            abToggleBtn.style.color = s.is_ab ? 'var(--p)' : 'var(--text-muted)';
            abToggleBtn.style.borderColor = s.is_ab ? 'var(--p)' : 'var(--border)';
        }
    }

    const addStepBtn = document.getElementById('inst-add-step-btn');
    if (addStepBtn) addStepBtn.addEventListener('click', () => {
        saveStep();
        steps.push({ step: steps.length + 1, wait: 2, subject: '', body: '', is_ab: false, subject_b: '', body_b: '' });
        currentStep = steps.length;
        loadStep();
        renderSteps();
    });

    const saveStepBtn = document.getElementById('inst-save-step-btn');
    if (saveStepBtn) saveStepBtn.addEventListener('click', () => { saveStep(); renderSteps(); showToast('Step saved'); });

    const sendSeqBtn = document.getElementById('inst-send-seq-btn');
    if (sendSeqBtn) sendSeqBtn.addEventListener('click', async () => {
        saveStep();
        renderSteps();
        const emptySteps = steps.filter(s => !s.subject || !s.body.trim());
        if (emptySteps.length > 0) { showToast(`Step ${emptySteps[0].step} is incomplete`, 'error'); return; }

        const leadsText = (document.getElementById('seq-leads') || {}).value || '';
        const leads = [];
        leadsText.split('\n').map(l => l.trim()).filter(l => l).forEach(line => {
            const parts = line.split(',').map(p => p.trim());
            leads.push({ email: parts[0], name: parts[1] || '', company: parts[2] || '' });
        });

        if (leads.length === 0) {
            showToast('Please add at least one lead in the Campaign Audience', 'error');
            return;
        }

        // Convert sequence steps to a single campaign with A/B variants for MVP
        const s1 = steps[0];
        const payload = {
            subject: s1.subject,
            body: steps.map(s => `<div>${s.body}</div>`).join('<hr>'),
            type: 'cold_mail',
            leads: leads,
            is_ab_test: !!s1.is_ab,
            subject_b: s1.subject_b || '',
            body_b: steps.map(s => `<div>${s.is_ab ? (s.body_b || s.body) : s.body}</div>`).join('<hr>')
        };

        sendSeqBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Launching...';
        sendSeqBtn.disabled = true;
        try {
            const res = await apiCall('/campaigns/send', 'POST', payload);
            if (res.ok) showToast('Campaign launched successfully!');
            else { const d = await res.json(); showToast(d.detail || 'Failed', 'error'); }
        } catch(e) { showToast('Error launching campaign', 'error'); }
        sendSeqBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> Launch Campaign';
        sendSeqBtn.disabled = false;
    });

    loadStep();
    renderSteps();
}

// ============================================================
// A/B TEST
// ============================================================
function setupABTest() {
    const sendBtn = document.getElementById('ab-send-btn');
    if (!sendBtn) return;
    sendBtn.addEventListener('click', async () => {
        const subjectA = (document.getElementById('ab-subject-a') || {}).value;
        const bodyA = (document.getElementById('ab-body-a') || {}).value;
        const subjectB = (document.getElementById('ab-subject-b') || {}).value;
        const bodyB = (document.getElementById('ab-body-b') || {}).value;
        const statusDiv = document.getElementById('ab-status');
        if (!subjectA || !bodyA || !subjectB || !bodyB) {
            if (statusDiv) { statusDiv.textContent = 'Please fill all A/B fields.'; statusDiv.className = 'alert error'; statusDiv.style.display = 'block'; }
            return;
        }
        sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...';
        sendBtn.disabled = true;
        try {
            const res = await apiCall('/campaigns/send', 'POST', { subject: subjectA, body: bodyA, subject_b: subjectB, body_b: bodyB, is_ab_test: true });
            if (statusDiv) {
                statusDiv.textContent = res.ok ? 'A/B test launched!' : 'Failed to launch';
                statusDiv.className = res.ok ? 'alert success' : 'alert error';
                statusDiv.style.display = 'block';
            }
        } catch(e) { showToast('Error', 'error'); }
        sendBtn.innerHTML = '<i class="fa-solid fa-flask"></i> Run A/B Test';
        sendBtn.disabled = false;
    });
}

// ============================================================
// ADMIN
// ============================================================
function setupAdmin() {
    // loadAdminUsers is called when admin tab is selected
}

async function loadAdminUsers() {
    try {
        const res = await apiCall('/admin/users');
        if (!res.ok) return;
        const users = await res.json();
        const tbody = document.getElementById('admin-users-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.id}</td>
                <td>${u.email}</td>
                <td>${u.is_admin ? '<span style="color:#6366f1;font-weight:600;">Admin</span>' : 'User'}</td>
                <td style="display:flex;gap:8px;">
                    ${!u.is_admin ? `<button class="btn danger" onclick="deleteUser(${u.id})" style="padding:5px 10px;font-size:12px;">Delete</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); }
}

window.deleteUser = async function(id) {
    if (!confirm('Delete this user?')) return;
    const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
    if (res.ok) { showToast('User deleted'); loadAdminUsers(); }
};

// ============================================================
// AI CHAT
// ============================================================
function setupAIChat() {
    const chatBtn = document.getElementById('ai-chat-btn');
    const chatPanel = document.getElementById('ai-chat-panel');
    const closeBtn = document.getElementById('ai-chat-close');
    const sendBtn = document.getElementById('ai-chat-send');
    const input = document.getElementById('ai-chat-input');
    const messages = document.getElementById('ai-chat-messages');
    if (!chatBtn) return;

    chatBtn.addEventListener('click', () => {
        chatPanel.style.display = chatPanel.style.display === 'flex' ? 'none' : 'flex';
        chatPanel.style.flexDirection = 'column';
    });
    if (closeBtn) closeBtn.addEventListener('click', () => { chatPanel.style.display = 'none'; });

    async function sendMsg() {
        const text = input.value.trim();
        if (!text) return;
        addMsg(text, 'user');
        input.value = '';
        const typingDiv = document.createElement('div');
        typingDiv.style.cssText = 'background:#f1f5f9;padding:10px 14px;border-radius:12px;font-size:13px;color:#6b7280;';
        typingDiv.textContent = '...';
        messages.appendChild(typingDiv);
        messages.scrollTop = messages.scrollHeight;
        try {
            const res = await fetch(API_URL + '/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ message: text, history: [] })
            });
            typingDiv.remove();
            if (res.ok) { const d = await res.json(); addMsg(d.reply || d.message, 'ai'); }
            else addMsg('Sorry, AI service unavailable. Set your Gemini API key in Settings.', 'ai');
        } catch(e) { typingDiv.remove(); addMsg('Network error.', 'ai'); }
    }

    function addMsg(text, sender) {
        const div = document.createElement('div');
        div.style.cssText = sender === 'user'
            ? 'background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;padding:10px 14px;border-radius:12px;font-size:14px;align-self:flex-end;max-width:85%;'
            : 'background:#f1f5f9;color:#374151;padding:10px 14px;border-radius:12px;font-size:14px;max-width:85%;';
        div.innerHTML = text.replace(/\n/g, '<br>');
        if (messages) { messages.appendChild(div); messages.scrollTop = messages.scrollHeight; }
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMsg);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
}

async function renderColdMailList() {
    await fetchDashboard(true);
    const tbody = document.getElementById('cold-mail-list-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const campaigns = (window.lastFetchedCampaigns || []).filter(c => c.type === 'cold_mail');
    
    if (campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">No Cold Mail campaigns found.</td></tr>';
        return;
    }
    
    campaigns.forEach(c => {
        const tr = document.createElement('tr');
        const openRate = c.sent_count > 0 ? Math.round((c.opens / c.sent_count) * 100) : 0;
        const clickRate = c.sent_count > 0 ? Math.round((c.clicks / c.sent_count) * 100) : 0;
        const cStatus = c.status || 'Draft';
        const statusColor = cStatus.toLowerCase() === 'completed' ? '#059669' : (cStatus.toLowerCase() === 'failed' ? '#dc2626' : '#64748b');
        
        tr.innerHTML = `
            <td><div style="font-weight:600;color:var(--text);">${c.subject || 'Untitled'}</div></td>
            <td><span style="font-size:13px; font-weight:600; color:${statusColor}; text-transform:capitalize;">${cStatus}</span></td>
            <td>${openRate}%</td>
            <td>${clickRate}%</td>
            <td>
                <div style="display:flex; gap:6px; justify-content:flex-end;">
                    <button class="btn" style="padding:6px 12px;font-size:13px;background:#f8fafc;border:1px solid var(--border);" onclick="openColdMailBuilder(${c.id})" title="Edit"><i class="fa-solid fa-pen-to-square" style="color:#64748b;"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function renderNewsletterList() {
    await fetchDashboard(true);
    const tbody = document.getElementById('newsletters-list-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const campaigns = (window.lastFetchedCampaigns || []).filter(c => c.type !== 'cold_mail');
    
    if (campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted);">No Newsletters found.</td></tr>';
        return;
    }
    
    campaigns.forEach(c => {
        const tr = document.createElement('tr');
        const cStatus = c.status || 'Draft';
        const statusColor = cStatus.toLowerCase() === 'completed' ? '#059669' : (cStatus.toLowerCase() === 'failed' ? '#dc2626' : '#64748b');
        
        tr.innerHTML = `
            <td><div style="font-weight:600;color:var(--text);">${c.subject || 'Untitled'}</div></td>
            <td><span style="font-size:13px; font-weight:600; color:${statusColor}; text-transform:capitalize;">${cStatus}</span></td>
            <td>${c.sent_count}</td>
            <td>
                <div style="display:flex; gap:6px; justify-content:flex-end;">
                    <button class="btn" style="padding:6px 12px;font-size:13px;background:#f8fafc;border:1px solid var(--border);" onclick="openNewsletterBuilder(${c.id})" title="Edit"><i class="fa-solid fa-pen-to-square" style="color:#64748b;"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openColdMailBuilder = function(id) {
    document.querySelectorAll('#app-page .view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('cold-mail-builder');
    if (target) target.classList.add('active');
    
    if (id) {
        window.editCampaign(id);
    } else {
        window.currentCampaignId = null;
        document.getElementById('inst-subject').value = '';
        document.getElementById('inst-body').value = '';
        document.getElementById('seq-leads').value = '';
        window.switchColdTab('sequences');
    }
}

window.openNewsletterBuilder = function(id) {
    document.querySelectorAll('#app-page .view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('campaigns-builder');
    if (target) target.classList.add('active');
    
    if (id) {
        window.editCampaign(id);
    } else {
        window.currentCampaignId = null;
        document.getElementById('campaign-subject').value = '';
        document.getElementById('newsletter-leads').value = '';
        window.switchVbTab('audience');
    }
}

window.checkSpamScore = async function() {
    const text = document.getElementById('inst-body').value;
    if (!text.trim()) {
        showToast("Please write an email first to check spam score.");
        return;
    }
    
    try {
        const res = await fetch('/api/spam-check', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({content: text})
        });
        if (res.ok) {
            const data = await res.json();
            if (data.score === 10) {
                showToast("✅ Spam Score: 10/10 (Excellent! No spam words found)");
            } else {
                showToast(`⚠️ Spam Score: ${data.score}/10 (Found spam words: ${data.found_words.join(', ')})`);
            }
        }
    } catch(e) {
        console.error(e);
        showToast("Error checking spam score.");
    }
};

const TEMPLATES = {
    saas_outreach: {
        subject: "{Quick question|Thoughts on} your {workflow|current process} at {{company}}?",
        body: "Hey {{firstName}},\n\nI noticed that {{company}} is growing {fast|rapidly}, and I was wondering how you're handling your current workflow.\n\n{Many|Several} companies like yours use our platform to {save time|automate tasks} and {reduce costs|increase efficiency}. \n\nWould you be open to a quick {5-minute|short} chat next week to see if there's a fit?\n\n{Best|Cheers},\nYour Name"
    },
    sales_followup: {
        subject: "{Following up|Checking in} - {{company}} / Our last {chat|email}",
        body: "Hi {{firstName}},\n\nI just wanted to {follow up|check in} on my previous email. {I know you're busy|Things get busy}, so I wanted to bump this to the top of your inbox.\n\nHave you had a chance to {review|look at} the info I sent over? Let me know if you have any questions or if now isn't the right time.\n\n{Thanks|Best regards},\nYour Name"
    },
    link_building: {
        subject: "{Quick question|Collab idea} about your article on {{company}} blog",
        body: "Hey {{firstName}},\n\nI was doing some research on {topic} and came across your excellent article on the {{company}} blog.\n\nI {really enjoyed|loved} your point about [insert point here]. I actually just published a comprehensive guide that {complements|expands on} your piece perfectly.\n\nWould you consider {linking to it|adding it as a resource}? I'd be happy to share your article with my {audience|newsletter} as well.\n\n{Cheers|Best},\nYour Name"
    }
};

window.loadTemplate = function() {
    const selector = document.getElementById('template-selector');
    const val = selector.value;
    
    if (val && TEMPLATES[val]) {
        document.getElementById('inst-subject').value = TEMPLATES[val].subject;
        document.getElementById('inst-body').value = TEMPLATES[val].body;
        showToast("Template loaded successfully!");
    } else {
        document.getElementById('inst-subject').value = "";
        document.getElementById('inst-body').value = "";
    }
};

function setupDragDrop(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.style.borderColor = "var(--p)";
        el.style.background = "#eef2ff";
    });
    
    el.addEventListener('dragleave', (e) => {
        e.preventDefault();
        el.style.borderColor = "var(--border)";
        el.style.background = "#fff";
    });
    
    el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.style.borderColor = "var(--border)";
        el.style.background = "#fff";
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const text = evt.target.result;
                    const lines = text.split('\n').filter(l => l.trim().length > 0);
                    // Append or Replace? Replace is safer.
                    el.value = text;
                    showToast(`✅ Successfully loaded ${lines.length} leads from ${file.name}`);
                };
                reader.readAsText(file);
            } else {
                showToast("⚠️ Please drop a valid .csv or .txt file.");
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupDragDrop('seq-leads');
    setupDragDrop('newsletter-leads');
});

window.toggleTheme = function() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        document.getElementById('theme-icon').className = 'fa-solid fa-moon';
        document.getElementById('theme-switch').style.left = '2px';
        document.getElementById('theme-switch').style.background = '#fff';
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('theme-icon').className = 'fa-solid fa-sun';
        document.getElementById('theme-switch').style.left = '16px';
        document.getElementById('theme-switch').style.background = 'var(--p)';
    }
};

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        setTimeout(() => {
            const icon = document.getElementById('theme-icon');
            const sw = document.getElementById('theme-switch');
            if (icon && sw) {
                icon.className = 'fa-solid fa-sun';
                sw.style.left = '16px';
                sw.style.background = 'var(--p)';
            }
        }, 100);
    }
});

// Inbox Preview Feature
window.previewInbox = function(subjectId, bodyId) {
    const subjectEl = document.getElementById(subjectId);
    const bodyEl = document.getElementById(bodyId);
    
    if (!subjectEl || !bodyEl) return;
    
    const subjectText = subjectEl.value || "(No Subject)";
    const bodyText = bodyEl.value || "(Empty Body)";
    
    document.getElementById('preview-subject').textContent = subjectText;
    document.getElementById('preview-body').textContent = bodyText;
    
    document.getElementById('inbox-preview-modal').style.display = 'flex';
};

