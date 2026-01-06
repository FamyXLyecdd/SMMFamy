/**
 * SMMFamy - Support Tickets System
 * Customer support ticket management | ~350 lines
 */

const Tickets = {
    // Ticket statuses
    statuses: {
        open: 'Open',
        inProgress: 'In Progress',
        resolved: 'Resolved',
        closed: 'Closed'
    },

    // Ticket priorities
    priorities: {
        low: { name: 'Low', color: 'success' },
        medium: { name: 'Medium', color: 'warning' },
        high: { name: 'High', color: 'error' },
        urgent: { name: 'Urgent', color: 'error' }
    },

    // Ticket categories
    categories: [
        'Order Issue',
        'Payment Problem',
        'Refill Request',
        'Account Issue',
        'Technical Support',
        'Refund Request',
        'Other'
    ],

    /**
     * Create new ticket
     */
    create(data) {
        const user = Auth.getCurrentUser();
        if (!user) return { success: false, error: 'Not logged in' };

        const ticket = {
            id: 'TKT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(),
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            subject: data.subject,
            category: data.category,
            priority: data.priority || 'medium',
            status: 'open',
            orderId: data.orderId || null,
            messages: [
                {
                    id: Utils.generateId('msg_'),
                    sender: 'user',
                    senderName: user.name,
                    content: data.message,
                    timestamp: new Date().toISOString()
                }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const tickets = Storage.get('tickets', []);
        tickets.unshift(ticket);
        Storage.set('tickets', tickets);

        Auth.logActivity('ticket_create', { ticketId: ticket.id, subject: ticket.subject });

        return { success: true, ticket };
    },

    /**
     * Add reply to ticket
     */
    addReply(ticketId, message, isAdmin = false) {
        const user = Auth.getCurrentUser();
        if (!user) return { success: false, error: 'Not logged in' };

        const tickets = Storage.get('tickets', []);
        const index = tickets.findIndex(t => t.id === ticketId);

        if (index === -1) return { success: false, error: 'Ticket not found' };

        // Check access
        if (!user.isAdmin && tickets[index].userId !== user.id) {
            return { success: false, error: 'Access denied' };
        }

        const reply = {
            id: Utils.generateId('msg_'),
            sender: user.isAdmin ? 'admin' : 'user',
            senderName: user.isAdmin ? 'Support Team' : user.name,
            content: message,
            timestamp: new Date().toISOString()
        };

        tickets[index].messages.push(reply);
        tickets[index].updatedAt = new Date().toISOString();

        // Auto-update status
        if (user.isAdmin && tickets[index].status === 'open') {
            tickets[index].status = 'inProgress';
        }

        Storage.set('tickets', tickets);

        Auth.logActivity('ticket_reply', { ticketId, isAdmin });

        return { success: true, reply };
    },

    /**
     * Update ticket status
     */
    updateStatus(ticketId, status) {
        if (!Auth.isAdmin()) return { success: false, error: 'Admin access required' };

        const tickets = Storage.get('tickets', []);
        const index = tickets.findIndex(t => t.id === ticketId);

        if (index === -1) return { success: false, error: 'Ticket not found' };

        tickets[index].status = status;
        tickets[index].updatedAt = new Date().toISOString();

        if (status === 'resolved' || status === 'closed') {
            tickets[index].closedAt = new Date().toISOString();
        }

        Storage.set('tickets', tickets);

        Auth.logActivity('ticket_status_update', { ticketId, status });

        return { success: true };
    },

    /**
     * Get user's tickets
     */
    getUserTickets() {
        const user = Auth.getCurrentUser();
        if (!user) return [];

        const tickets = Storage.get('tickets', []);
        return tickets.filter(t => t.userId === user.id);
    },

    /**
     * Get all tickets (admin)
     */
    getAllTickets(filter = {}) {
        if (!Auth.isAdmin()) return [];

        let tickets = Storage.get('tickets', []);

        if (filter.status) {
            tickets = tickets.filter(t => t.status === filter.status);
        }

        if (filter.priority) {
            tickets = tickets.filter(t => t.priority === filter.priority);
        }

        if (filter.category) {
            tickets = tickets.filter(t => t.category === filter.category);
        }

        return tickets;
    },

    /**
     * Get single ticket
     */
    getTicket(ticketId) {
        const user = Auth.getCurrentUser();
        if (!user) return null;

        const tickets = Storage.get('tickets', []);
        const ticket = tickets.find(t => t.id === ticketId);

        if (!ticket) return null;

        // Check access
        if (!user.isAdmin && ticket.userId !== user.id) {
            return null;
        }

        return ticket;
    },

    /**
     * Get open ticket count
     */
    getOpenCount() {
        const tickets = Storage.get('tickets', []);
        return tickets.filter(t => t.status === 'open' || t.status === 'inProgress').length;
    },

    /**
     * Render ticket list
     */
    renderTicketList(containerId, tickets) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (tickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">?</div>
                    <h3 class="empty-state-title">No Tickets</h3>
                    <p class="empty-state-description">You haven't created any support tickets yet.</p>
                    <button class="btn btn-primary" onclick="Tickets.showCreateModal()">Create Ticket</button>
                </div>
            `;
            return;
        }

        container.innerHTML = tickets.map(ticket => `
            <div class="card card-sm card-hover ticket-item" onclick="Tickets.showTicket('${ticket.id}')" style="cursor: pointer; margin-bottom: var(--space-3);">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="status-badge status-${ticket.status}">${this.statuses[ticket.status]}</span>
                            <span class="badge badge-${this.priorities[ticket.priority].color}">${this.priorities[ticket.priority].name}</span>
                        </div>
                        <h4 style="margin: var(--space-2) 0;">${Utils.escapeHtml(ticket.subject)}</h4>
                        <div class="text-sm text-muted">
                            <span>${ticket.category}</span>
                            <span style="margin: 0 var(--space-2);">•</span>
                            <span>${ticket.messages.length} message${ticket.messages.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div class="text-sm text-muted text-right">
                        <div>${ticket.id}</div>
                        <div>${Utils.formatRelativeTime(ticket.updatedAt)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Show create ticket modal
     */
    showCreateModal(orderId = null) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop open';

        const modal = document.createElement('div');
        modal.className = 'modal modal-md open';
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Create Support Ticket</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="ticketForm">
                    <div class="form-group">
                        <label class="form-label form-label-required">Category</label>
                        <select class="form-select" id="ticketCategory" required>
                            ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                        </select>
                    </div>
                    
                    ${orderId ? `
                        <div class="form-group">
                            <label class="form-label">Related Order</label>
                            <input type="text" class="form-input" value="${orderId}" readonly>
                        </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label class="form-label form-label-required">Subject</label>
                        <input type="text" class="form-input" id="ticketSubject" 
                               placeholder="Brief description of your issue" required maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label form-label-required">Message</label>
                        <textarea class="form-textarea" id="ticketMessage" rows="5" 
                                  placeholder="Describe your issue in detail..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Priority</label>
                        <select class="form-select" id="ticketPriority">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary btn-cancel">Cancel</button>
                <button class="btn btn-primary btn-submit">Submit Ticket</button>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        const close = () => {
            backdrop.remove();
            modal.remove();
        };

        modal.querySelector('.modal-close').addEventListener('click', close);
        modal.querySelector('.btn-cancel').addEventListener('click', close);
        backdrop.addEventListener('click', close);

        modal.querySelector('.btn-submit').addEventListener('click', () => {
            const category = modal.querySelector('#ticketCategory').value;
            const subject = modal.querySelector('#ticketSubject').value.trim();
            const message = modal.querySelector('#ticketMessage').value.trim();
            const priority = modal.querySelector('#ticketPriority').value;

            if (!subject || !message) {
                Notify.error('Please fill in all required fields');
                return;
            }

            const result = this.create({
                category,
                subject,
                message,
                priority,
                orderId
            });

            if (result.success) {
                Notify.success('Ticket created successfully');
                close();

                // Refresh ticket list if on tickets page
                if (typeof App !== 'undefined' && App.currentPage === 'tickets') {
                    App.initTicketsPage();
                }
            } else {
                Notify.error(result.error);
            }
        });
    },

    /**
     * Show ticket detail
     */
    showTicket(ticketId) {
        const ticket = this.getTicket(ticketId);
        if (!ticket) {
            Notify.error('Ticket not found');
            return;
        }

        const user = Auth.getCurrentUser();
        const isAdmin = user?.isAdmin;

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop open';

        const modal = document.createElement('div');
        modal.className = 'modal modal-lg open';
        modal.innerHTML = `
            <div class="modal-header">
                <div>
                    <h3 class="modal-title">${Utils.escapeHtml(ticket.subject)}</h3>
                    <div class="text-sm text-muted">${ticket.id} • ${ticket.category}</div>
                </div>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
                <div class="flex gap-2" style="margin-bottom: var(--space-4);">
                    <span class="status-badge status-${ticket.status}">${this.statuses[ticket.status]}</span>
                    <span class="badge badge-${this.priorities[ticket.priority].color}">${this.priorities[ticket.priority].name}</span>
                </div>
                
                <div class="ticket-messages">
                    ${ticket.messages.map(msg => `
                        <div class="card card-flat" style="margin-bottom: var(--space-3); ${msg.sender === 'admin' ? 'border-left: 3px solid var(--color-primary-500);' : ''}">
                            <div class="flex justify-between items-center" style="margin-bottom: var(--space-2);">
                                <strong>${Utils.escapeHtml(msg.senderName)}</strong>
                                <span class="text-sm text-muted">${Utils.formatRelativeTime(msg.timestamp)}</span>
                            </div>
                            <p style="white-space: pre-wrap;">${Utils.escapeHtml(msg.content)}</p>
                        </div>
                    `).join('')}
                </div>
                
                ${ticket.status !== 'closed' && ticket.status !== 'resolved' ? `
                    <div class="form-group" style="margin-top: var(--space-4);">
                        <label class="form-label">Add Reply</label>
                        <textarea class="form-textarea" id="replyMessage" rows="3" placeholder="Type your reply..."></textarea>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                ${isAdmin ? `
                    <select class="form-select" id="ticketStatus" style="width: auto;">
                        ${Object.entries(this.statuses).map(([key, val]) =>
            `<option value="${key}" ${ticket.status === key ? 'selected' : ''}>${val}</option>`
        ).join('')}
                    </select>
                ` : ''}
                <button class="btn btn-secondary btn-close">Close</button>
                ${ticket.status !== 'closed' && ticket.status !== 'resolved' ? `
                    <button class="btn btn-primary btn-reply">Send Reply</button>
                ` : ''}
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        const close = () => {
            backdrop.remove();
            modal.remove();
        };

        modal.querySelector('.modal-close').addEventListener('click', close);
        modal.querySelector('.btn-close').addEventListener('click', close);
        backdrop.addEventListener('click', close);

        // Reply handler
        const replyBtn = modal.querySelector('.btn-reply');
        if (replyBtn) {
            replyBtn.addEventListener('click', () => {
                const message = modal.querySelector('#replyMessage').value.trim();
                if (!message) {
                    Notify.error('Please enter a message');
                    return;
                }

                const result = this.addReply(ticketId, message, isAdmin);
                if (result.success) {
                    Notify.success('Reply sent');
                    close();
                    this.showTicket(ticketId); // Refresh
                } else {
                    Notify.error(result.error);
                }
            });
        }

        // Status update handler (admin)
        const statusSelect = modal.querySelector('#ticketStatus');
        if (statusSelect) {
            statusSelect.addEventListener('change', () => {
                const newStatus = statusSelect.value;
                const result = this.updateStatus(ticketId, newStatus);
                if (result.success) {
                    Notify.success('Status updated');
                } else {
                    Notify.error(result.error);
                }
            });
        }
    }
};

// Export for use
window.Tickets = Tickets;
