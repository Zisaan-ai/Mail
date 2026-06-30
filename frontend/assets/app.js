const API_URL = 'https://email-marketer-ijk5.onrender.com/api';
let token = null;
try {
    token = localStorage.getItem('token');
} catch (e) {
    console.error("localStorage access denied:", e);
}

// Elements
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

// Auth Logic
const authForm = document.getElementById('auth-form');
const authAlert = document.getElementById('auth-alert');
const toggleAuthBtn = document.getElementById('toggle-auth');
let isLoginMode = true;

function checkAuth() {
    if (token) {
        document.getElementById('auth-view').classList.remove('active');
        document.getElementById('app-view').classList.add('active');
        fetchDashboard();
        
        let isAdmin = false;
        try {
            isAdmin = localStorage.getItem('is_admin') === 'true';
        } catch (e) {}
        if(isAdmin) {
            document.getElementById('nav-admin').style.display = 'flex';
        } else {
            document.getElementById('nav-admin').style.display = 'none';
        }
    } else {
        document.getElementById('app-view').classList.remove('active');
        document.getElementById('auth-view').classList.add('active');
    }
}

    // Fallback: Global event listener for any element with id toggle-auth
    document.addEventListener('click', (e) => {
        let target = e.target;
        // If target is inside the a tag, get the a tag
        while (target && target !== document) {
            if (target.id === 'toggle-auth') {
                e.preventDefault();
                // alert("Toggle clicked! Mode was: " + (isLoginMode ? "Login" : "Signup")); // Debug
                isLoginMode = !isLoginMode;
                document.getElementById('auth-title').innerText = isLoginMode ? 'Login to MailClone' : 'Register for MailClone';
                document.getElementById('auth-subtitle').innerText = isLoginMode ? 'Enter your details to access your account.' : 'Join thousands of marketers scaling their business.';
                document.getElementById('auth-btn').innerText = isLoginMode ? 'Sign In' : 'Create Account';
                
                const options = document.getElementById('auth-options');
                if(options) options.style.display = isLoginMode ? 'flex' : 'none';
                
                const p = document.getElementById('auth-toggle-text');
                const linkText = isLoginMode ? "Sign up" : "Log in";
                const prefixText = isLoginMode ? "Don't have an account? " : "Already have an account? ";
                p.innerHTML = `${prefixText} <a href="#" id="toggle-auth">${linkText}</a>`;
                break;
            }
            target = target.parentNode;
        }
    });

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    
    authAlert.style.display = 'none';

    try {
        let res;
        if (isLoginMode) {
            const formData = new URLSearchParams();
            formData.append('username', email); // OAuth2 expects 'username' field
            formData.append('password', password);
            res = await fetch(`${API_URL}/auth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });
        } else {
            res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            });
        }

        const data = await res.json();
        if (res.ok) {
            if (data.status === "needs_verification") {
                document.getElementById('auth-form').style.display = 'none';
                document.querySelector('.auth-footer').style.display = 'none';
                document.getElementById('verification-box').style.display = 'block';
                showToast("Verification code sent to your email!", "success");
                return;
            }
            token = data.access_token;
            localStorage.setItem('token', token);
            if (data.is_admin) {
                localStorage.setItem('is_admin', 'true');
            } else {
                localStorage.removeItem('is_admin');
            }
            checkAuth();
        } else {
            authAlert.innerText = data.detail || "Authentication failed";
            authAlert.className = 'alert error';
            authAlert.style.display = 'block';
        }
    } catch (err) {
        authAlert.innerText = "Network error";
        authAlert.className = 'alert error';
        authAlert.style.display = 'block';
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('is_admin');
    checkAuth();
});

// Helper for API calls
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${token}` };
    if (body) headers['Content-Type'] = 'application/json';
    
    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });
    
    if (res.status === 401) {
        token = null;
        localStorage.removeItem('token');
        checkAuth();
        throw new Error('Unauthorized');
    }
    
    return res;
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('data-target');
        
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        
        if (targetId === 'admin-view') {
            loadAdminUsers();
        }
        if(targetId === 'dashboard') fetchDashboard();
        if(targetId === 'contacts') fetchContacts();
    });
});

// App Logic
async function fetchDashboard() {
    try {
        const [contactsRes, campaignsRes] = await Promise.all([
            apiCall('/contacts'),
            apiCall('/campaigns')
        ]);
        
        const contacts = await contactsRes.json();
        const campaigns = await campaignsRes.json();
        
        let totalSent = 0;
        let totalOpens = 0;
        let totalClicks = 0;
        
        const tbody = document.querySelector('#dashboard-campaigns tbody');
        tbody.innerHTML = '';
        
        window.lastFetchedCampaigns = campaigns;
        
        campaigns.forEach(c => {
            totalSent += c.sent_count;
            totalOpens += c.opens;
            totalClicks += c.clicks;
            
            let sentHtml = `${c.sent_count}`;
            let opensHtml = `${c.opens} <span style="font-size:0.8em; color:var(--text-muted)">(${c.sent_count > 0 ? Math.round((c.opens/c.sent_count)*100) : 0}%)</span>`;
            
            if (c.is_ab_test) {
                sentHtml = `<div style="font-size:12px;">A: ${c.sent_count_a} | B: ${c.sent_count_b}</div>`;
                const aPct = c.sent_count_a > 0 ? Math.round((c.opens_a/c.sent_count_a)*100) : 0;
                const bPct = c.sent_count_b > 0 ? Math.round((c.opens_b/c.sent_count_b)*100) : 0;
                opensHtml = `<div style="font-size:12px;">A: ${c.opens_a} (${aPct}%) | B: ${c.opens_b} (${bPct}%)</div>`;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    ${c.subject}
                    ${c.is_ab_test ? '<span style="background:#f3e8ff; color:#a855f7; font-size:10px; padding:2px 6px; border-radius:10px; margin-left:5px;">A/B</span>' : ''}
                </td>
                <td>${sentHtml}</td>
                <td>${opensHtml}</td>
                <td>${c.clicks} <span style="font-size:0.8em; color:var(--text-muted)">(${c.opens > 0 ? Math.round((c.clicks/c.opens)*100) : 0}%)</span></td>
                <td><span class="status-badge ${c.status.toLowerCase()}">${c.status}</span></td>
                <td>
                    <button class="btn" style="padding: 5px 10px; font-size: 13px;" onclick="editCampaign(${c.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('stat-contacts').innerText = contacts.length;
        document.getElementById('stat-sent').innerText = totalSent;
        document.getElementById('stat-opens').innerText = totalOpens;
        document.getElementById('stat-clicks').innerText = totalClicks;
    } catch (e) { console.error(e); }
}

async function fetchContacts() {
    try {
        const res = await apiCall('/contacts');
        const contacts = await res.json();
        
        const tbody = document.querySelector('#contacts-table tbody');
        tbody.innerHTML = '';
        
        contacts.forEach(contact => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${contact.name}</td>
                <td>${contact.email}</td>
                <td>${contact.tags.split(',').map(t => `<span style="background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px; font-size:0.8em; margin-right:5px;">${t.trim()}</span>`).join('')}</td>
                <td><button class="btn danger" onclick="deleteContact(${contact.id})" style="padding:5px 10px"><i class="fa-solid fa-trash"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
}

window.editCampaign = function(id) {
    if(!window.lastFetchedCampaigns) return;
    const campaign = window.lastFetchedCampaigns.find(c => c.id === id);
    if(!campaign) return;
    
    // Switch to Campaigns Tab
    document.querySelector('.nav-item[data-target="campaigns"]').click();
    
    // Switch to Instantly Sub-Tab (since we can edit raw HTML there easily)
    document.querySelector('.tab-btn[data-tab="tab-instantly"]').click();
    
    // Load into Sequence Editor (Step 1)
    sequenceSteps = [{
        step: 1, day: 1, wait: 0,
        subject: campaign.subject,
        body: campaign.body
    }];
    currentInstStep = 1;
    loadInstStep(1);
    renderInstSteps();
    
    showToast("Campaign loaded for editing");
};

document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const tags = document.getElementById('contact-tags').value;
    
    const res = await apiCall('/contacts', 'POST', { name, email, tags });
    if(res.ok) {
        document.getElementById('contact-form').reset();
        fetchContacts();
    }
});

window.deleteContact = async (id) => {
    if(confirm("Delete contact?")) {
        await apiCall(`/contacts/${id}`, 'DELETE');
        fetchContacts();
    }
};

// ==========================================
// DRAG AND DROP VISUAL BUILDER LOGIC
// ==========================================
const canvasWrapper = document.querySelector('.builder-canvas-wrapper');
const canvas = document.getElementById('builder-canvas');
const palette = document.getElementById('block-palette');
const propertyEditor = document.getElementById('property-editor');
const propertyFields = document.getElementById('property-fields');
let selectedBlock = null;

// Drop Indicator Element
const dropIndicator = document.createElement('div');
dropIndicator.className = 'drop-indicator';

let currentDropTarget = null;

// Drag and Drop Events on Canvas Wrapper
canvasWrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    const blocks = Array.from(canvas.querySelectorAll('.email-block'));
    
    if (blocks.length === 0) return;

    // Find nearest block to drop before
    let closestBlock = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    blocks.forEach(block => {
        const box = block.getBoundingClientRect();
        const offset = e.clientY - box.top - box.height / 2;
        if (offset < 0 && offset > closestOffset) {
            closestOffset = offset;
            closestBlock = block;
        }
    });

    if (closestBlock) {
        canvas.insertBefore(dropIndicator, closestBlock);
        dropIndicator.style.display = 'block';
        currentDropTarget = closestBlock;
    } else {
        canvas.appendChild(dropIndicator);
        dropIndicator.style.display = 'block';
        currentDropTarget = null;
    }
});

// --- TOAST NOTIFICATION ---
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = message;
    toast.style.bottom = '20px';
    setTimeout(() => {
        toast.style.bottom = '-100px';
    }, 3000);
}

// Check auth on load
document.addEventListener('DOMContentLoaded', () => {
    // Canvas wrapper listener setup
});

window.drag = (e) => {
    const type = e.target.closest('.draggable-block').getAttribute('data-type');
    e.dataTransfer.setData("type", type);
};

window.addBlockToCanvas = (type, targetBlock = null) => {
    const placeholder = canvas.querySelector('.canvas-placeholder');
    if (placeholder) placeholder.remove();

    const block = document.createElement('div');
    block.className = 'email-block';
    block.setAttribute('data-type', type);
    
    // Add Block Actions
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

    if (type === 'text') {
        content.innerHTML = `<p style="font-family:Helvetica, Arial, sans-serif; font-size:16px; color:#241C15; line-height:1.5; padding:20px;">New Text Block. Click the pencil to edit.</p>`;
    } else if (type === 'image') {
        content.innerHTML = `<img src="https://via.placeholder.com/600x200?text=Your+Image+Here" style="max-width:100%; height:auto; display:block;">`;
    } else if (type === 'button') {
        content.innerHTML = `<div style="text-align:center; padding:20px;"><a href="#" style="background:#007C89; color:#FFF; padding:12px 24px; text-decoration:none; display:inline-block; border-radius:4px; font-weight:bold; font-family:Helvetica, Arial, sans-serif;">Click Me</a></div>`;
    } else if (type === 'divider') {
        content.innerHTML = `<hr style="border:0; border-top:2px solid #E0E0DF; margin:20px 0;">`;
    }

    block.appendChild(content);

    if (targetBlock) {
        canvas.insertBefore(block, targetBlock);
    } else {
        canvas.appendChild(block);
    }
    
    bindBlockEvents(block);
    
    // Auto-select on drop
    setTimeout(() => selectBlock({ stopPropagation: () => {} }, block), 10);
    showToast("Block added");
};

function bindBlockEvents(block) {
    block.addEventListener('click', (e) => selectBlock(e, block));
    
    const actions = block.querySelector('.block-actions');
    actions.querySelector('.edit').addEventListener('click', (e) => {
        e.stopPropagation();
        selectBlock(e, block);
    });
    
    actions.querySelector('.duplicate').addEventListener('click', (e) => {
        e.stopPropagation();
        const clone = block.cloneNode(true);
        block.parentNode.insertBefore(clone, block.nextSibling);
        bindBlockEvents(clone);
        showToast("Block duplicated");
    });
    
    actions.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this block?")) {
            block.remove();
            if (selectedBlock === block) {
                document.getElementById('property-editor').style.display = 'none';
                document.getElementById('block-palette').style.display = 'block';
                selectedBlock = null;
            }
            showToast("Block deleted");
            if(canvas.querySelectorAll('.email-block').length === 0) {
                canvas.innerHTML = '<div class="canvas-placeholder">Drag blocks here to build your email</div>';
            }
        }
    });
}

canvasWrapper.addEventListener('drop', (e) => {
    e.preventDefault();
    dropIndicator.style.display = 'none';
    
    const type = e.dataTransfer.getData("type");
    if (!type) return;
    
    window.addBlockToCanvas(type, currentDropTarget);
});

// Click to add block for better UX
document.querySelectorAll('.draggable-block').forEach(block => {
    block.addEventListener('click', () => {
        window.addBlockToCanvas(block.getAttribute('data-type'));
    });
});

// Select a block to edit
function selectBlock(event, block) {
    if(event) event.stopPropagation(); // prevent clicking canvas
    
    // Deselect previous
    document.querySelectorAll('.email-block').forEach(b => b.classList.remove('selected'));
    
    selectedBlock = block;
    block.classList.add('selected');
    
    // Show Property Editor
    palette.style.display = 'none';
    propertyEditor.style.display = 'block';
    
    const type = block.getAttribute('data-type');
    const contentDiv = block.querySelector('.block-content');
    
    propertyFields.innerHTML = '';
    
    if (type === 'text') {
        const textHTML = contentDiv.innerHTML;
        const currentFontSize = contentDiv.style.fontSize ? parseInt(contentDiv.style.fontSize) : 16;
        const currentPadding = contentDiv.style.padding ? parseInt(contentDiv.style.padding) : 20;
        
        propertyFields.innerHTML = `
            <div class="form-group">
                <label>Text Content (HTML allowed)</label>
                <textarea id="prop-text" rows="5" style="width: 100%; border: 1px solid var(--border-color); border-radius: 4px; padding: 10px; font-family: monospace;">${textHTML}</textarea>
            </div>
            <div class="form-group" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <label>Font Size</label>
                <span id="font-size-val" style="font-weight:bold; color:var(--primary);">${currentFontSize}px</span>
            </div>
            <input type="range" id="prop-font-size" min="10" max="72" value="${currentFontSize}" style="width:100%; margin-bottom:15px;" oninput="document.getElementById('font-size-val').innerText = this.value + 'px';">
            
            <div class="form-group" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <label>Padding (Top/Bottom)</label>
                <span id="padding-val" style="font-weight:bold; color:var(--primary);">${currentPadding}px</span>
            </div>
            <input type="range" id="prop-padding" min="0" max="100" value="${currentPadding}" style="width:100%; margin-bottom:15px;" oninput="document.getElementById('padding-val').innerText = this.value + 'px';">
        `;
    } else if (type === 'image') {
        const img = contentDiv.querySelector('img');
        const currentWidth = img.style.maxWidth ? parseInt(img.style.maxWidth) : 100;
        
        propertyFields.innerHTML = `
            <div class="form-group">
                <label>Image URL</label>
                <input type="text" id="prop-img-src" value="${img.src}">
            </div>
            <div class="form-group">
                <label style="background:var(--primary); color:white; padding:10px; border-radius:4px; cursor:pointer; text-align:center; display:block; font-weight:600; transition: background 0.3s;">
                    <i class="fa-solid fa-cloud-arrow-up"></i> Upload from Gallery
                    <input type="file" id="prop-img-upload" accept="image/*" style="display:none;">
                </label>
            </div>
            <div class="form-group" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <label>Image Width</label>
                <span id="img-width-val" style="font-weight:bold; color:var(--primary);">${currentWidth}%</span>
            </div>
            <input type="range" id="prop-img-width" min="10" max="100" value="${currentWidth}" style="width:100%; margin-bottom:15px;" oninput="document.getElementById('img-width-val').innerText = this.value + '%';">
        `;
        
        // Handle local file upload preview
        document.getElementById('prop-img-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    document.getElementById('prop-img-src').value = ev.target.result;
                    showToast("Image uploaded successfully!");
                };
                reader.readAsDataURL(file);
            }
        });
        
    } else if (type === 'button') {
        const a = contentDiv.querySelector('a');
        const currentRadius = a.style.borderRadius ? parseInt(a.style.borderRadius) : 4;
        const currentPadding = a.style.padding ? parseInt(a.style.padding) : 15;
        
        propertyFields.innerHTML = `
            <div class="form-group">
                <label>Button Text</label>
                <input type="text" id="prop-btn-text" value="${a.innerText}">
            </div>
            <div class="form-group">
                <label>Button Link (URL)</label>
                <input type="text" id="prop-btn-url" value="${a.getAttribute('href') || '#'}">
            </div>
            <div style="display:flex; gap:15px; margin-bottom:15px;">
                <div class="form-group" style="flex:1;">
                    <label>Bg Color</label>
                    <input type="color" id="prop-btn-color" value="${rgb2hex(a.style.backgroundColor) || '#007C89'}" style="width:100%; height:45px; cursor:pointer; padding:0; border:none; border-radius:4px;">
                </div>
                <div class="form-group" style="flex:1;">
                    <label>Text Color</label>
                    <input type="color" id="prop-btn-text-color" value="${rgb2hex(a.style.color) || '#FFFFFF'}" style="width:100%; height:45px; cursor:pointer; padding:0; border:none; border-radius:4px;">
                </div>
            </div>
            <div class="form-group" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <label>Border Radius</label>
                <span id="btn-radius-val" style="font-weight:bold; color:var(--primary);">${currentRadius}px</span>
            </div>
            <input type="range" id="prop-btn-radius" min="0" max="50" value="${currentRadius}" style="width:100%; margin-bottom:15px;" oninput="document.getElementById('btn-radius-val').innerText = this.value + 'px';">
            
            <div class="form-group" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <label>Button Size (Padding)</label>
                <span id="btn-padding-val" style="font-weight:bold; color:var(--primary);">${currentPadding}px</span>
            </div>
            <input type="range" id="prop-btn-padding" min="5" max="40" value="${currentPadding}" style="width:100%; margin-bottom:15px;" oninput="document.getElementById('btn-padding-val').innerText = this.value + 'px';">
        `;
    } else if (type === 'divider') {
        propertyFields.innerHTML = `<p style="color:var(--text-muted); font-size:0.9em; text-align:center; padding:20px; background:#f9f9f9; border-radius:4px;">Divider has no editable properties.</p>`;
    }
}

// Back to palette button
document.getElementById('back-to-palette-btn').addEventListener('click', () => {
    if (selectedBlock) {
        selectedBlock.classList.remove('selected');
        selectedBlock = null;
    }
    document.getElementById('property-editor').style.display = 'none';
    document.getElementById('block-palette').style.display = 'block';
});

// Deselect when clicking canvas (not on a block)
canvasWrapper.addEventListener('click', (e) => {
    if (e.target === canvas) {
        document.querySelectorAll('.email-block').forEach(b => b.classList.remove('selected'));
        selectedBlock = null;
        palette.style.display = 'block';
        propertyEditor.style.display = 'none';
    }
});

// Save properties
document.getElementById('save-block-btn').addEventListener('click', () => {
    if (!selectedBlock) return;
    const type = selectedBlock.getAttribute('data-type');
    const contentDiv = selectedBlock.querySelector('.block-content');

    if (type === 'text') {
        contentDiv.innerHTML = document.getElementById('prop-text').value;
        contentDiv.style.fontSize = document.getElementById('prop-font-size').value + 'px';
        contentDiv.style.padding = document.getElementById('prop-padding').value + 'px 20px';
    } else if (type === 'image') {
        const img = contentDiv.querySelector('img');
        img.src = document.getElementById('prop-img-src').value;
        img.style.maxWidth = document.getElementById('prop-img-width').value + '%';
        img.style.margin = '0 auto';
    } else if (type === 'button') {
        const a = contentDiv.querySelector('a');
        a.innerText = document.getElementById('prop-btn-text').value;
        a.setAttribute('href', document.getElementById('prop-btn-url').value);
        a.style.backgroundColor = document.getElementById('prop-btn-color').value;
        a.style.color = document.getElementById('prop-btn-text-color').value;
        a.style.borderRadius = document.getElementById('prop-btn-radius').value + 'px';
        const p = document.getElementById('prop-btn-padding').value;
        a.style.padding = `${p}px ${Math.round(p*1.5)}px`;
    }
    
    // Return to palette
    selectedBlock.classList.remove('selected');
    selectedBlock = null;
    palette.style.display = 'block';
    propertyEditor.style.display = 'none';
    showToast("Changes applied");
});

// Delete Block
document.getElementById('delete-block-btn').addEventListener('click', () => {
    if (!selectedBlock) return;
    selectedBlock.remove();
    selectedBlock = null;
    palette.style.display = 'block';
    propertyEditor.style.display = 'none';
    
    if(canvas.children.length === 0) {
        canvas.innerHTML = '<div class="canvas-placeholder">Drag blocks here to build your email</div>';
    }
});

// Helper: RGB to Hex for color picker
function rgb2hex(rgb) {
    if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return rgb ? "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]) : null;
}

// Send Campaign
document.getElementById('send-btn').addEventListener('click', async () => {
    const subject = document.getElementById('campaign-subject').value;
    const statusDiv = document.getElementById('campaign-status');
    const btn = document.getElementById('send-btn');
    
    if(!subject) {
        statusDiv.className = 'alert error';
        statusDiv.innerText = "Please enter a subject line.";
        return;
    }

    // Extract HTML from canvas blocks
    const blocks = Array.from(canvas.querySelectorAll('.block-content'));
    if(blocks.length === 0) {
        statusDiv.className = 'alert error';
        statusDiv.innerText = "Your email is empty! Drag some blocks into the canvas.";
        return;
    }

    // Build the final HTML email body
    let rawHTML = '';
    blocks.forEach(b => rawHTML += b.outerHTML + '\n');
    
    // Get canvas bg color
    const canvasBg = document.getElementById('builder-canvas').style.backgroundColor || '#FFFFFF';
    
    // Wrap in MailChimp-style generic container
    const finalHTML = `
<div style="background:#F6F6F4; padding:20px; font-family:Helvetica, Arial, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:${canvasBg}; border:1px solid #E0E0DF;">
        <div style="padding:40px;">
            ${rawHTML}
        </div>
        <div style="background:#F6F6F4; padding:20px; text-align:center; font-size:12px; color:#6C6D67; border-top:1px solid #E0E0DF;">
            <p style="margin: 0;">You are receiving this email because you subscribed to our list.</p>
            <p style="margin: 10px 0 0 0;"><a href="#" style="color:#007C89; text-decoration:underline;">Unsubscribe from our emails</a></p>
        </div>
    </div>
</div>`;

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Blasting...';
    btn.disabled = true;
    
    try {
        const leadsText = document.getElementById('newsletter-leads').value;
        const leads = [];
        leadsText.split('\n').map(l => l.trim()).filter(l => l).forEach(line => {
            const parts = line.split(',').map(p => p.trim());
            leads.push({
                email: parts[0],
                name: parts.length > 1 ? parts[1] : '',
                company: parts.length > 2 ? parts[2] : ''
            });
        });
        const payload = { subject, body: finalHTML };
        if (leads.length > 0) {
            payload.leads = leads;
        }
        const res = await apiCall('/campaigns/send', 'POST', payload);
        if (res.ok) {
            statusDiv.className = 'alert success';
            statusDiv.innerText = "Campaign successfully queued and blasting!";
            document.getElementById('campaign-subject').value = '';
            canvas.innerHTML = '<div class="canvas-placeholder">Drag blocks here to build your email</div>';
        } else {
            const data = await res.json();
            statusDiv.className = 'alert error';
            statusDiv.innerText = data.detail || "Failed to send";
        }
    } catch (err) {
        showToast("Error sending campaign.");
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Blast Campaign';
        btn.disabled = false;
    }
});

// Device Preview Toggle
document.getElementById('preview-desktop').addEventListener('click', (e) => {
    e.target.classList.add('active');
    e.target.style.background = 'var(--primary)';
    e.target.style.color = 'white';
    
    const mobBtn = document.getElementById('preview-mobile');
    mobBtn.classList.remove('active');
    mobBtn.style.background = 'transparent';
    mobBtn.style.color = 'var(--text-color)';
    
    document.getElementById('builder-canvas').style.maxWidth = '600px';
});

document.getElementById('preview-mobile').addEventListener('click', (e) => {
    e.target.classList.add('active');
    e.target.style.background = 'var(--primary)';
    e.target.style.color = 'white';
    
    const dskBtn = document.getElementById('preview-desktop');
    dskBtn.classList.remove('active');
    dskBtn.style.background = 'transparent';
    dskBtn.style.color = 'var(--text-color)';
    
    document.getElementById('builder-canvas').style.maxWidth = '320px'; // Mobile width
});

// Global BG Color
document.getElementById('global-bg-color').addEventListener('input', (e) => {
    document.getElementById('builder-canvas').style.backgroundColor = e.target.value;
});

const premadeTemplates = {
    sell_products: [
        { type: 'text', content: '<div class="block-content" style="text-align: center; padding: 40px 20px 20px;"><h1 style="margin:0; font-family:\'Georgia\', serif; font-size:28px; font-style:italic; color:#241c15; letter-spacing: 2px;">LUXE & CO.</h1></div>' },
        { type: 'image', content: '<div class="block-content"><img src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" style="max-width:100%; height:auto; display:block; border-radius: 0px;" alt="Hero"></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 40px 50px 20px; text-align: center; background-color: #ffffff;"><h2 style="margin: 0 0 20px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 32px; font-weight: 700; color: #241c15; line-height: 1.3;">Our New Fall Collection is Here</h2><p style="margin: 0; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; color: #6c6d67; line-height: 1.6;">Discover the latest trends and timeless classics designed for the modern lifestyle. Handcrafted with premium materials for unmatched comfort and style.</p></div>' },
        { type: 'button', content: '<div class="block-content" style="text-align: center; padding: 10px 50px 40px; background-color: #ffffff;"><a href="#" style="display: inline-block; padding: 16px 40px; background-color: #241c15; color: #ffffff; text-decoration: none; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; border-radius: 50px; letter-spacing: 1px;">SHOP THE COLLECTION</a></div>' },
        { type: 'divider', content: '<div class="block-content"><hr style="border: 0; border-top: 1px solid #e0e0df; margin: 0 50px;"></div>' },
        { type: 'image', content: '<div class="block-content" style="padding: 40px 50px 0;"><img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" style="max-width:100%; height:auto; display:block; border-radius: 8px;"></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 30px 50px 40px; text-align: center;"><h3 style="margin: 0 0 15px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 600; color: #241c15;">Sustainable Fashion</h3><p style="margin: 0 0 20px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 15px; color: #6c6d67; line-height: 1.6;">We believe in fashion that looks good and does good. Our new collection uses 100% recycled materials.</p></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 40px 50px; background-color: #f6f6f4; text-align: center;"><p style="margin: 0 0 10px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 12px; color: #6c6d67; line-height: 1.5;">© 2026 LUXE & CO. All rights reserved.<br>123 Fashion Avenue, New York, NY 10001</p></div>' }
    ],
    make_announcement: [
        { type: 'image', content: '<div class="block-content" style="text-align:center; padding: 40px 0 20px;"><img src="https://via.placeholder.com/150x50/FFFFFF/007C89?text=YOUR+LOGO" style="max-width:150px; height:auto; display:inline-block;"></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 20px 50px 40px; text-align: center; background-color: #ffffff;"><h1 style="margin: 0; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 800; color: #007C89; line-height: 1.1; letter-spacing: -1px;">Big News.</h1></div>' },
        { type: 'image', content: '<div class="block-content"><img src="https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" style="max-width:100%; height:auto; display:block; border-radius: 0px;" alt="Announcement"></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 50px; text-align: left; background-color: #ffffff;"><h2 style="margin: 0 0 20px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: #241c15;">We are expanding our services!</h2><p style="margin: 0 0 20px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; color: #6c6d67; line-height: 1.6;">After months of hard work behind the scenes, we are thrilled to announce that we are rolling out a whole new suite of tools designed specifically for you.</p><p style="margin: 0; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; color: #6c6d67; line-height: 1.6;">This means faster delivery, better quality, and more ways for us to help your business grow.</p></div>' },
        { type: 'button', content: '<div class="block-content" style="text-align: left; padding: 0 50px 50px; background-color: #ffffff;"><a href="#" style="display: inline-block; padding: 15px 35px; background-color: #007C89; color: #ffffff; text-decoration: none; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; border-radius: 4px;">Read the Full Story</a></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 40px 50px; background-color: #241c15; text-align: center;"><p style="margin: 0 0 10px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 12px; color: #ffffff; line-height: 1.5; opacity: 0.7;">© 2026 Your Company. All rights reserved.</p></div>' }
    ],
    newsletter: [
        { type: 'text', content: '<div class="block-content" style="text-align: center; padding: 40px 20px 20px; background-color: #f6f6f4;"><p style="margin:0; font-family:\'Courier New\', Courier, monospace; font-size:14px; color:#6c6d67; letter-spacing: 2px; text-transform: uppercase;">Issue #42 &bull; October 2026</p><h1 style="margin:10px 0 0; font-family:\'Georgia\', serif; font-size:36px; font-weight:bold; color:#241c15; letter-spacing: -1px;">THE WEEKLY DIGEST</h1></div>' },
        { type: 'divider', content: '<div class="block-content" style="background-color: #f6f6f4; padding: 0 20px;"><hr style="border: 0; border-top: 2px solid #241c15; margin: 0;"></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 40px 40px 20px; text-align: left; background-color: #ffffff;"><h2 style="margin: 0 0 15px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: #241c15;">1. The Future of AI in Marketing</h2><p style="margin: 0; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; color: #6c6d67; line-height: 1.6;">Artificial intelligence is no longer just a buzzword. This week, we dive deep into how top brands are using AI to personalize customer experiences at scale.</p></div>' },
        { type: 'image', content: '<div class="block-content" style="padding: 0 40px;"><img src="https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" style="max-width:100%; height:auto; display:block; border-radius: 4px;" alt="AI"></div>' },
        { type: 'button', content: '<div class="block-content" style="text-align: left; padding: 20px 40px 40px; background-color: #ffffff;"><a href="#" style="display: inline-block; color: #007C89; text-decoration: none; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; border-bottom: 2px solid #007C89; padding-bottom: 2px;">Read Article &rarr;</a></div>' },
        { type: 'divider', content: '<div class="block-content"><hr style="border: 0; border-top: 1px solid #e0e0df; margin: 0 40px;"></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 40px 40px 20px; text-align: left; background-color: #ffffff;"><h2 style="margin: 0 0 15px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: #241c15;">2. 5 Tips for Better Email Design</h2><p style="margin: 0; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; color: #6c6d67; line-height: 1.6;">Design matters. We compiled the top 5 design principles you must follow to ensure your emails not only look great but also convert.</p></div>' },
        { type: 'button', content: '<div class="block-content" style="text-align: left; padding: 0 40px 40px; background-color: #ffffff;"><a href="#" style="display: inline-block; color: #007C89; text-decoration: none; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; border-bottom: 2px solid #007C89; padding-bottom: 2px;">Read Article &rarr;</a></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 40px; background-color: #241c15; text-align: center;"><p style="margin: 0; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 14px; color: #ffffff; line-height: 1.5;">Thanks for reading The Weekly Digest.<br>See you next week!</p></div>' }
    ],
    welcome_email: [
        { type: 'image', content: '<div class="block-content"><img src="https://images.unsplash.com/photo-1513151233558-d860c5398176?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" style="max-width:100%; height:auto; display:block;" alt="Welcome"></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 50px 50px 20px; text-align: center; background-color: #ffffff;"><h1 style="margin: 0 0 15px; font-family: \'Georgia\', serif; font-size: 36px; color: #241c15; line-height: 1.2;">Welcome to the family!</h1><p style="margin: 0; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; color: #6c6d67; line-height: 1.6;">We are so excited to have you on board. You\'ll now be the first to hear about our latest news, exclusive offers, and behind-the-scenes stories.</p></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 20px 50px; text-align: center; background-color: #ffffff;"><div style="background-color: #f6f6f4; border: 2px dashed #007C89; padding: 20px; border-radius: 8px;"><p style="margin: 0 0 10px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 14px; color: #6c6d67; font-weight: bold; text-transform: uppercase;">Use this code for 20% off your first order:</p><h2 style="margin: 0; font-family: \'Courier New\', Courier, monospace; font-size: 32px; color: #007C89; letter-spacing: 2px;">WELCOME20</h2></div></div>' },
        { type: 'button', content: '<div class="block-content" style="text-align: center; padding: 20px 50px 50px; background-color: #ffffff;"><a href="#" style="display: inline-block; padding: 18px 45px; background-color: #007C89; color: #ffffff; text-decoration: none; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; border-radius: 4px;">Start Shopping</a></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 40px 50px; background-color: #f6f6f4; text-align: center;"><p style="margin: 0; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 12px; color: #6c6d67;">You are receiving this email because you opted in at our website.</p></div>' }
    ],
    cold_email: [
        { type: 'text', content: '<div class="block-content" style="padding: 40px; border-top: 4px solid #3b82f6;"><h2 style="color: #111827; font-size: 20px; margin-top: 0; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif;">Hello,</h2><p style="color: #4b5563; line-height: 1.6; font-size: 15px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif;">I was browsing your website today and really loved the concept behind your business.</p><p style="color: #4b5563; line-height: 1.6; font-size: 15px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif;">However, I noticed a few technical issues causing the site to load slowly on mobile devices. As a web developer, I regularly help businesses fix these exact issues to improve their conversion rates.</p></div>' },
        { type: 'divider', content: '<div class="block-content"><hr style="border:0; border-top:1px solid #E0E0DF; margin:20px 0;"></div>' },
        { type: 'text', content: '<div class="block-content" style="padding: 0 40px 40px;"><p style="color: #4b5563; line-height: 1.6; font-size: 15px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif;">Would you be open to a quick 5-minute chat this week to discuss how we can fix this?</p><p style="color: #4b5563; line-height: 1.6; font-size: 15px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif;">Best,<br><strong>Web Dev Expert</strong></p></div>' }
    ]
};

document.getElementById('premade-templates').addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    
    // Clear canvas
    canvas.innerHTML = '';
    
    const blocksData = premadeTemplates[val];
    blocksData.forEach(data => {
        // Create block using standard method
        window.addBlockToCanvas(data.type);
        
        // Grab the newly created block (it will be the last one added)
        const newBlock = canvas.lastElementChild;
        
        // Overwrite the block-content inside it, keeping the block-actions intact
        const contentDiv = newBlock.querySelector('.block-content');
        if (contentDiv) {
            contentDiv.outerHTML = data.content;
        }
    });
    
    if (val === 'sell_products') {
        document.getElementById('campaign-subject').value = "Our New Fall Collection is Here!";
    } else if (val === 'make_announcement') {
        document.getElementById('campaign-subject').value = "Big News: We are expanding our services!";
    } else if (val === 'newsletter') {
        document.getElementById('campaign-subject').value = "The Weekly Digest: Future of AI & Design Tips";
    } else if (val === 'welcome_email') {
        document.getElementById('campaign-subject').value = "Welcome to the family! Here's 20% off.";
    } else if (val === 'cold_email') {
        document.getElementById('campaign-subject').value = "Quick idea for your website performance";
    }
});

// Init
checkAuth();

// ==========================================
// CAMPAIGN TABS & INSTANTLY LOGIC
// ==========================================

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Reset all tabs
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.style.color = 'var(--text-muted)';
            b.style.borderBottomColor = 'transparent';
        });
        document.querySelectorAll('.tab-content').forEach(c => {
            c.style.display = 'none';
            c.classList.remove('active');
        });
        
        // Activate clicked tab
        btn.classList.add('active');
        btn.style.color = 'var(--primary)';
        btn.style.borderBottomColor = 'var(--primary)';
        
        const targetId = btn.getAttribute('data-tab');
        const targetTab = document.getElementById(targetId);
        targetTab.style.display = 'block';
        targetTab.classList.add('active');
    });
});

// Instantly Sub-Nav Switching
document.querySelectorAll('.inst-nav').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.inst-nav').forEach(b => {
            b.classList.remove('active');
            b.style.color = 'var(--text-muted)';
            b.style.borderBottomColor = 'transparent';
            b.style.fontWeight = '500';
        });
        document.querySelectorAll('.inst-view').forEach(v => v.style.display = 'none');
        
        btn.classList.add('active');
        btn.style.color = 'var(--primary)';
        btn.style.borderBottomColor = 'var(--primary)';
        btn.style.fontWeight = '600';
        
        document.getElementById(btn.getAttribute('data-target')).style.display = 'block'; // Or flex if it's sequences
        if (btn.getAttribute('data-target') === 'inst-sequences') {
            document.getElementById('inst-sequences').style.display = 'flex';
        }
    });
});

// Newsletter Builder Tab Logic
document.querySelectorAll('.news-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.news-tab').forEach(b => {
            b.classList.remove('active');
            b.style.color = 'var(--text-muted)';
            b.style.borderBottomColor = 'transparent';
            b.style.fontWeight = '500';
        });
        document.querySelectorAll('.news-view').forEach(v => v.style.display = 'none');
        
        btn.classList.add('active');
        btn.style.color = 'var(--primary)';
        btn.style.borderBottomColor = 'var(--primary)';
        btn.style.fontWeight = '600';
        
        document.getElementById(btn.getAttribute('data-target')).style.display = 'block';
    });
});

// Sequence Builder Logic
let sequenceSteps = [
    { step: 1, day: 1, wait: 0, subject: '', body: '' }
];
let currentInstStep = 1;

function renderInstSteps() {
    const list = document.getElementById('inst-steps-list');
    list.innerHTML = '';
    sequenceSteps.forEach((s, index) => {
        const item = document.createElement('div');
        item.className = `inst-step-item ${s.step === currentInstStep ? 'active' : ''}`;
        item.style.padding = '15px';
        item.style.borderBottom = '1px solid var(--border-color)';
        item.style.cursor = 'pointer';
        item.style.background = '#fff';
        if (s.step === currentInstStep) {
            item.style.borderLeft = '3px solid var(--primary)';
        } else {
            item.style.borderLeft = '3px solid transparent';
        }
        
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 5px;">Step ${s.step}</div>
                ${s.step > 1 ? `<i class="fa-solid fa-trash inst-del-step" style="color:var(--danger); font-size:12px;" data-step="${s.step}"></i>` : ''}
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">Day ${s.day}</div>
        `;
        
        item.addEventListener('click', (e) => {
            if(e.target.classList.contains('inst-del-step')) {
                // Delete step
                sequenceSteps = sequenceSteps.filter(step => step.step !== s.step);
                // Re-index steps and days
                let currentDay = 1;
                sequenceSteps.forEach((step, i) => {
                    step.step = i + 1;
                    if(i === 0) {
                        step.wait = 0;
                        step.day = 1;
                    } else {
                        currentDay += step.wait;
                        step.day = currentDay;
                    }
                });
                if(currentInstStep > sequenceSteps.length) currentInstStep = sequenceSteps.length;
                if(sequenceSteps.length === 0) {
                    sequenceSteps = [{ step: 1, day: 1, wait: 0, subject: '', body: '' }];
                    currentInstStep = 1;
                }
                loadInstStep(currentInstStep);
                renderInstSteps();
                return;
            }
            saveCurrentInstStep();
            currentInstStep = s.step;
            loadInstStep(currentInstStep);
            renderInstSteps();
        });
        list.appendChild(item);
    });
}

function saveCurrentInstStep() {
    const stepObj = sequenceSteps.find(s => s.step === currentInstStep);
    if(stepObj) {
        stepObj.subject = document.getElementById('instantly-subject').value;
        stepObj.body = document.getElementById('instantly-body').innerHTML;
        if(currentInstStep > 1) {
            stepObj.wait = parseInt(document.getElementById('inst-wait-days').value) || 2;
        }
    }
}

function loadInstStep(stepNum) {
    const stepObj = sequenceSteps.find(s => s.step === stepNum);
    if(!stepObj) return;
    
    document.getElementById('inst-current-step-title').innerText = `Step ${stepObj.step}`;
    document.getElementById('instantly-subject').value = stepObj.subject;
    document.getElementById('instantly-body').innerHTML = stepObj.body;
    
    const waitContainer = document.getElementById('inst-wait-container');
    if (stepObj.step > 1) {
        waitContainer.style.display = 'flex';
        document.getElementById('inst-wait-days').value = stepObj.wait;
    } else {
        waitContainer.style.display = 'none';
    }
}

document.getElementById('inst-add-step').addEventListener('click', () => {
    saveCurrentInstStep();
    const newStepNum = sequenceSteps.length + 1;
    const prevDay = sequenceSteps[sequenceSteps.length - 1].day;
    const waitDays = 2; // default 2 days
    
    sequenceSteps.push({
        step: newStepNum,
        day: prevDay + waitDays,
        wait: waitDays,
        subject: '',
        body: ''
    });
    
    currentInstStep = newStepNum;
    loadInstStep(currentInstStep);
    renderInstSteps();
});

// Update day calculations when wait time changes
document.getElementById('inst-wait-days').addEventListener('input', () => {
    saveCurrentInstStep();
    let currentDay = 1;
    sequenceSteps.forEach((step, i) => {
        if(i > 0) {
            currentDay += step.wait;
            step.day = currentDay;
        }
    });
    renderInstSteps();
});

// Editor Variable Button
document.getElementById('inst-var-btn').addEventListener('click', () => {
    const variable = prompt("Enter variable name (e.g., firstName, company):", "firstName");
    if(variable) {
        document.execCommand('insertText', false, `{{${variable}}}`);
    }
});

// Instantly Send (Launch Sequence)
document.getElementById('instantly-send-btn').addEventListener('click', async () => {
    saveCurrentInstStep();
    const statusDiv = document.getElementById('instantly-status');
    const btn = document.getElementById('instantly-send-btn');
    
    // Validation
    const emptySteps = sequenceSteps.filter(s => !s.subject || !s.body.trim());
    if(emptySteps.length > 0) {
        statusDiv.className = 'alert error';
        statusDiv.innerText = `Step ${emptySteps[0].step} is missing subject or body.`;
        statusDiv.style.display = 'block';
        return;
    }
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Launching...';
    btn.disabled = true;
    
    try {
        // We compile the steps into a single HTML structure for the backend
        let compiledBody = `<div style="font-family: 'Inter', sans-serif; font-size: 15px; color: #111827;">`;
        sequenceSteps.forEach(s => {
            if(s.step > 1) {
                compiledBody += `<hr style="margin:30px 0; border:none; border-top: 1px dashed #D1D5DB;"><div style="color:var(--primary); font-size:12px; font-weight:bold; margin-bottom:15px; text-transform:uppercase;">Wait ${s.wait} Days<br>Subject: ${s.subject}</div>`;
            }
            compiledBody += `<div>${s.body}</div>`;
        });
        compiledBody += `</div>`;
        
        const mainSubject = sequenceSteps[0].subject;
        
        // Pass the isolated leads to the backend
        const payload = { 
            subject: mainSubject, 
            body: compiledBody,
            leads: currentCampaignLeads,
            is_ab_test: document.getElementById('inst-ab-test-toggle').checked
        };
        
        if (payload.is_ab_test) {
            payload.subject_b = document.getElementById('instantly-subject-b').value;
            payload.body_b = document.getElementById('instantly-body-b').innerHTML;
            if (!payload.subject_b || !document.getElementById('instantly-body-b').innerText.trim()) {
                statusDiv.className = 'alert error';
                statusDiv.innerText = `Variant B is missing subject or body.`;
                statusDiv.style.display = 'block';
                btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Launch Sequence';
                btn.disabled = false;
                return;
            }
        }
        
        const res = await apiCall('/campaigns/send', 'POST', payload);
        if (res.ok) {
            statusDiv.className = 'alert success';
            statusDiv.innerText = "Sequence successfully launched!";
            statusDiv.style.display = 'block';
        } else {
            const data = await res.json();
            statusDiv.className = 'alert error';
            statusDiv.innerText = data.detail || "Failed to launch";
            statusDiv.style.display = 'block';
        }
    } catch (err) {
        showToast("Error launching sequence.");
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Launch Sequence';
        btn.disabled = false;
    }
});

// Init Instantly UI
renderInstSteps();

document.getElementById('inst-ab-test-toggle').addEventListener('change', (e) => {
    const container = document.getElementById('inst-variant-b-container');
    container.style.display = e.target.checked ? 'block' : 'none';
});

// --- Isolated Campaign Leads Logic ---
let currentCampaignLeads = [];

function renderCampaignLeads() {
    const tbody = document.getElementById('inst-campaign-leads-tbody');
    const table = document.getElementById('inst-campaign-leads-table');
    const msg = document.getElementById('inst-no-leads-msg');
    
    tbody.innerHTML = '';
    
    if(currentCampaignLeads.length === 0) {
        table.style.display = 'none';
        msg.style.display = 'block';
    } else {
        table.style.display = 'table';
        msg.style.display = 'none';
        
        currentCampaignLeads.forEach((lead, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            tr.innerHTML = `
                <td>${lead.email}</td>
                <td>${lead.name || '-'}</td>
                <td>${lead.company || '-'}</td>
                <td><span class="badge" style="background:#E5E7EB; color:#374151;">Draft</span></td>
                <td>
                    <button class="btn icon-btn" style="color:var(--danger);" onclick="removeCampaignLead(${index})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.removeCampaignLead = function(index) {
    currentCampaignLeads.splice(index, 1);
    renderCampaignLeads();
};

document.getElementById('inst-save-lead-btn').addEventListener('click', () => {
    const emailsText = document.getElementById('inst-lead-emails').value;
    
    // Split by newline to get each lead
    const lines = emailsText.split('\n').map(l => l.trim()).filter(l => l);
    
    if(lines.length === 0) {
        alert("Please enter at least one email");
        return;
    }
    
    let added = 0;
    lines.forEach(line => {
        const parts = line.split(',').map(p => p.trim());
        const email = parts[0];
        const name = parts.length > 1 ? parts[1] : '';
        const company = parts.length > 2 ? parts[2] : '';
        
        if(email && !currentCampaignLeads.find(l => l.email === email)) {
            currentCampaignLeads.push({ email, name, company });
            added++;
        }
    });
    
    document.getElementById('inst-lead-emails').value = '';
    document.getElementById('inst-add-lead-modal').style.display = 'none';
    
    renderCampaignLeads();
    showToast("Lead added successfully!");
});

renderCampaignLeads();

// --- AI Chatbot & Generator Logic ---

let chatHistory = [];

const aiToggle = document.getElementById('ai-chat-toggle');
const aiWindow = document.getElementById('ai-chat-window');
const aiClose = document.getElementById('ai-chat-close');
const aiMessages = document.getElementById('ai-chat-messages');
const aiInput = document.getElementById('ai-chat-input');
const aiSend = document.getElementById('ai-chat-send');
const aiWriteBtn = document.getElementById('ai-write-btn');

// Toggle Chat
if(aiToggle) {
    aiToggle.addEventListener('click', () => {
        aiWindow.classList.add('active');
        aiToggle.style.display = 'none';
    });
}

if(aiClose) {
    aiClose.addEventListener('click', () => {
        aiWindow.classList.remove('active');
        aiToggle.style.display = 'flex';
    });
}

// Send Message logic
async function sendChatMessage() {
    const text = aiInput.value.trim();
    if(!text) return;

    // Add User Message
    appendMessage(text, 'user');
    aiInput.value = '';
    aiSend.disabled = true;

    // Show typing
    const typingId = showTypingIndicator();

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ message: text, history: chatHistory })
        });

        removeTypingIndicator(typingId);
        
        if (res.ok) {
            const data = await res.json();
            appendMessage(data.reply, 'ai');
            
            // Save to history
            chatHistory.push({role: 'user', content: text});
            chatHistory.push({role: 'model', content: data.reply});
        } else {
            appendMessage('Sorry, I encountered an error. Make sure your Gemini API key is configured.', 'ai');
        }
    } catch (e) {
        removeTypingIndicator(typingId);
        appendMessage('Network error. Please try again later.', 'ai');
    }
    
    aiSend.disabled = false;
    aiInput.focus();
}

if(aiSend) {
    aiSend.addEventListener('click', sendChatMessage);
}

if(aiInput) {
    aiInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendChatMessage();
    });
}

function appendMessage(text, sender) {
    const div = document.createElement('div');
    div.className = 'ai-message ' + sender;
    // Basic formatting for markdown-like bold and breaks
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    div.innerHTML = formattedText;
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'typing-indicator';
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if(el) el.remove();
}

// AI Write Button Logic
if(aiWriteBtn) {
    aiWriteBtn.addEventListener('click', async () => {
        const subject = document.getElementById('instantly-subject').value;
        let prompt = window.prompt("What should the email be about? (e.g. 'Invite to marketing webinar next Friday')");
        
        if(!prompt) return;
        if(subject) prompt += '\nSubject line of the email is: ' + subject;
        
        const originalText = aiWriteBtn.innerHTML;
        aiWriteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Writing...';
        aiWriteBtn.disabled = true;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ prompt: prompt })
            });
            
            if (res.ok) {
                const data = await res.json();
                document.getElementById('instantly-body').innerHTML = data.html;
                showToast('AI successfully generated the email content!');
            } else {
                showToast('Failed to generate email. Ensure API Key is set.');
            }
        } catch (e) {
            showToast('Network error while generating email.');
        }

        aiWriteBtn.innerHTML = originalText;
        aiWriteBtn.disabled = false;
    });
}

// --- ADMIN LOGIC ---
async function loadAdminUsers() {
    try {
        const res = await apiCall('/admin/users');
        if(!res) return;
        if(!res.ok) {
            const errData = await res.json();
            showToast("Error: " + (errData.detail || 'Unknown'), "error");
            return;
        }
        const data = await res.json();
        const tbody = document.getElementById('admin-users-list');
        tbody.innerHTML = '';
        data.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.email}</td>
                <td>${u.is_admin ? '<span style="color:var(--primary); font-weight:bold;">Admin</span>' : 'User'}</td>
                <td>${u.is_approved ? '<span style="color:green; font-weight:bold;">Approved</span>' : '<span style="color:#f59e0b; font-weight:bold;">Pending</span>'}</td>
                <td style="display:flex; gap:10px;">
                    ${!u.is_approved ? `<button class="btn primary" onclick="approveUser(${u.id})">Approve</button>` : ''}
                    ${!u.is_admin ? `<button class="btn danger" onclick="deleteUser(${u.id})">Delete</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) {
        showToast("JS Error: " + err.message, "error");
    }
}

window.approveUser = async function(id) {
    if(!confirm("Approve this user to use the application?")) return;
    const res = await fetch(`${API_URL}/admin/users/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if(res.ok) {
        showToast("User approved successfully!");
        loadAdminUsers();
    } else {
        showToast("Failed to approve user", "error");
    }
}

window.deleteUser = async function(id) {
    if(!confirm("Delete this user permanently?")) return;
    const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if(res.ok) {
        showToast("User deleted");
        loadAdminUsers();
    } else {
        showToast("Failed to delete user", "error");
    }
}

// --- VERIFICATION LOGIC ---
document.getElementById('verify-btn').addEventListener('click', async () => {
    const code = document.getElementById('verification-code').value;
    const email = document.getElementById('auth-email').value;
    
    if(!code || code.length !== 6) {
        showToast("Please enter a valid 6-digit code", "error");
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        
        const data = await res.json();
        if(res.ok) {
            // Successfully verified and approved!
            token = data.access_token;
            localStorage.setItem('token', token);
            if (data.is_admin) {
                localStorage.setItem('is_admin', 'true');
            } else {
                localStorage.removeItem('is_admin');
            }
            showToast("Email verified successfully!");
            document.getElementById('verification-box').style.display = 'none';
            document.getElementById('auth-form').style.display = 'block';
            document.querySelector('.auth-footer').style.display = 'block';
            checkAuth();
        } else {
            // Might be 403 Wait for admin approve, or 400 invalid code
            if(res.status === 403) {
                // Verified but needs admin approval
                showToast("Email verified! Please wait for admin approval.", "success");
                document.getElementById('verification-box').style.display = 'none';
                document.getElementById('auth-form').style.display = 'block';
                document.querySelector('.auth-footer').style.display = 'block';
                // Switch to login mode
                isLoginMode = true;
                document.getElementById('toggle-auth').innerText = "Sign up";
                document.getElementById('auth-title').innerText = 'Welcome back';
                document.getElementById('auth-subtitle').innerText = 'Enter your details to access your account.';
                document.getElementById('auth-btn').innerText = 'Sign In';
            } else {
                showToast(data.detail || "Verification failed", "error");
            }
        }
    } catch(err) {
        showToast("Network error", "error");
    }
});


// --- Forgot Password Logic ---
const forgotPwdLink = document.getElementById('forgot-pwd-link');
const authFormBox = document.getElementById('auth-form');
const authFooter = document.querySelector('.auth-footer');
const forgotPwdBox = document.getElementById('forgot-password-box');
const backToLoginBtn = document.getElementById('back-to-login');
const sendResetBtn = document.getElementById('send-reset-btn');
const resetPwdBtn = document.getElementById('reset-pwd-btn');
const authDivider = document.querySelector('.auth-divider');

forgotPwdLink?.addEventListener('click', (e) => {
    e.preventDefault();
    authFormBox.style.display = 'none';
    authFooter.style.display = 'none';
    if(authDivider) authDivider.style.display = 'none';
    forgotPwdBox.style.display = 'block';
});

backToLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPwdBox.style.display = 'none';
    authFormBox.style.display = 'block';
    authFooter.style.display = 'block';
    if(authDivider) authDivider.style.display = 'flex';
    document.getElementById('forgot-step-1').style.display = 'block';
    document.getElementById('forgot-step-2').style.display = 'none';
    document.getElementById('forgot-pwd-text').innerText = 'Enter your email to receive a reset code.';
});

sendResetBtn?.addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value;
    if(!email) return showToast('Please enter your email', 'error');
    
    sendResetBtn.innerText = 'Sending...';
    try {
        const res = await fetch(API_URL + '/auth/forgot-password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email})
        });
        const data = await res.json();
        
        showToast(data.message, 'success');
        document.getElementById('forgot-step-1').style.display = 'none';
        document.getElementById('forgot-step-2').style.display = 'block';
        document.getElementById('forgot-pwd-text').innerText = 'Enter the 6-digit code and your new password.';
    } catch(err) {
        showToast('Network error', 'error');
    }
    sendResetBtn.innerText = 'Send Code';
});

resetPwdBtn?.addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value;
    const code = document.getElementById('reset-code').value;
    const new_password = document.getElementById('new-password').value;
    
    if(!code || !new_password) return showToast('Please fill all fields', 'error');
    
    resetPwdBtn.innerText = 'Resetting...';
    try {
        const res = await fetch(API_URL + '/auth/reset-password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, code, new_password})
        });
        const data = await res.json();
        
        if(res.ok) {
            showToast('Password reset successful! Please log in.', 'success');
            backToLoginBtn.click();
        } else {
            showToast(data.detail || 'Error resetting password', 'error');
        }
    } catch(err) {
        showToast('Network error', 'error');
    }
    resetPwdBtn.innerText = 'Reset Password';
});
