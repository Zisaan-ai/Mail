const ACCOUNTS = {
    list: [],
    
    init: function() {
        this.fetchAccounts();
    },
    
    fetchAccounts: async function() {
        try {
            const res = await fetch('/api/sending-accounts', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
            if(res.ok) {
                this.list = await res.json();
                this.render();
            }
        } catch(e) {
            console.error("Failed to fetch accounts", e);
        }
    },
    
    render: function() {
        const tbody = document.getElementById('accounts-table-body');
        tbody.innerHTML = '';
        if(this.list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:32px;text-align:center;color:var(--text-muted);">No accounts connected yet. Setup your first sending account to start delivering campaigns.</td></tr>`;
            return;
        }
        
        this.list.forEach(acc => {
            const statusBadge = acc.is_active 
                ? `<span style="background:#dcfce7;color:#059669;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">Active</span>`
                : `<span style="background:#f1f5f9;color:#475569;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">Paused</span>`;
                
            const toggleAction = acc.is_active
                ? `<button onclick="ACCOUNTS.toggleStatus(${acc.id}, false)" class="btn" style="padding:6px 12px;font-size:13px;margin-right:8px;"><i class="fa-solid fa-pause"></i> Pause</button>`
                : `<button onclick="ACCOUNTS.toggleStatus(${acc.id}, true)" class="btn" style="padding:6px 12px;font-size:13px;margin-right:8px;"><i class="fa-solid fa-play"></i> Resume</button>`;

            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid var(--border)";
            tr.innerHTML = `
                <td style="padding:16px 24px;font-weight:600;">${acc.name || '-'}</td>
                <td style="padding:16px 24px;">${acc.email}</td>
                <td style="padding:16px 24px;">${acc.daily_limit}</td>
                <td style="padding:16px 24px;">${acc.sent_today}</td>
                <td style="padding:16px 24px;">${statusBadge}</td>
                <td style="padding:16px 24px;text-align:right;">
                    ${toggleAction}
                    <button onclick="ACCOUNTS.deleteAccount(${acc.id})" class="btn" style="padding:6px 12px;font-size:13px;color:#ef4444;border-color:#fecaca;"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },
    
    showAddModal: function() {
        document.getElementById('add-account-modal').style.display = 'flex';
    },
    
    saveAccount: async function() {
        const payload = {
            name: document.getElementById('acc-name').value,
            email: document.getElementById('acc-email').value,
            smtp_server: document.getElementById('acc-smtp-server').value,
            smtp_port: parseInt(document.getElementById('acc-smtp-port').value) || 587,
            smtp_username: document.getElementById('acc-smtp-username').value,
            smtp_password: document.getElementById('acc-smtp-password').value,
            daily_limit: parseInt(document.getElementById('acc-daily-limit').value) || 500,
            imap_server: document.getElementById('acc-imap-server')?.value || null,
            imap_port: parseInt(document.getElementById('acc-imap-port')?.value) || 993,
            imap_password: document.getElementById('acc-imap-password')?.value || null,
            warmup_enabled: document.getElementById('acc-warmup-enabled')?.checked || false,
            warmup_daily_limit: parseInt(document.getElementById('acc-warmup-limit')?.value) || 5,
            warmup_increment_per_day: parseInt(document.getElementById('acc-warmup-increment')?.value) || 2
        };
        
        if(!payload.email || !payload.smtp_server || !payload.smtp_password) {
            alert("Email, Server, and Password are required");
            return;
        }
        
        try {
            const res = await fetch('/api/sending-accounts', {
                method: 'POST',
                headers: { 
                    'Authorization': 'Bearer ' + localStorage.getItem('token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if(res.ok) {
                document.getElementById('add-account-modal').style.display = 'none';
                this.fetchAccounts();
            } else {
                alert("Failed to add account");
            }
        } catch(e) {
            console.error("Add account error", e);
        }
    },
    
    toggleStatus: async function(id, isActive) {
        try {
            const res = await fetch('/api/sending-accounts/' + id, {
                method: 'PATCH',
                headers: { 
                    'Authorization': 'Bearer ' + localStorage.getItem('token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: isActive })
            });
            if(res.ok) {
                this.fetchAccounts();
            }
        } catch(e) {
            console.error("Toggle status error", e);
        }
    },
    
    deleteAccount: async function(id) {
        if(!confirm("Are you sure you want to delete this account?")) return;
        try {
            const res = await fetch('/api/sending-accounts/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
            if(res.ok) {
                this.fetchAccounts();
            }
        } catch(e) {
            console.error("Delete account error", e);
        }
    }
};

// Initialize accounts list when nav is clicked or app loads
document.addEventListener('DOMContentLoaded', () => {
    // Attach to existing nav click listener if possible, or just init here.
    // It's safe to init here if they are logged in, but token might not be ready.
});