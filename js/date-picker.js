/**
 * SMMFamy - Date Picker Component
 * Custom date picker with range selection | ~400 lines
 */

const DatePicker = {
    instances: new Map(),

    /**
     * Create date picker
     */
    create(inputId, options = {}) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        if (!input) return null;

        const config = {
            format: 'YYYY-MM-DD',
            minDate: null,
            maxDate: null,
            range: false,
            locale: 'en',
            firstDayOfWeek: 0, // 0 = Sunday
            showWeekNumbers: false,
            disabledDates: [],
            disabledDays: [],
            onChange: null,
            onOpen: null,
            onClose: null,
            ...options
        };

        const picker = {
            input,
            config,
            container: null,
            currentMonth: new Date(),
            selectedDate: null,
            selectedRange: { start: null, end: null },
            isOpen: false
        };

        this.setup(picker);
        this.instances.set(input, picker);

        return picker;
    },

    /**
     * Setup picker
     */
    setup(picker) {
        const { input } = picker;

        // Create container
        picker.container = document.createElement('div');
        picker.container.className = 'date-picker-dropdown';
        picker.container.innerHTML = this.renderCalendar(picker);
        document.body.appendChild(picker.container);

        // Input click handler
        input.addEventListener('click', () => this.toggle(picker));
        input.addEventListener('focus', () => this.open(picker));

        // Container click handlers
        picker.container.addEventListener('click', (e) => {
            const target = e.target;

            if (target.classList.contains('dp-prev')) {
                this.prevMonth(picker);
            } else if (target.classList.contains('dp-next')) {
                this.nextMonth(picker);
            } else if (target.classList.contains('dp-day') && !target.classList.contains('disabled')) {
                this.selectDate(picker, target.dataset.date);
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!picker.container.contains(e.target) && e.target !== input) {
                this.close(picker);
            }
        });

        // Parse initial value
        if (input.value) {
            const date = this.parseDate(input.value, picker.config.format);
            if (date) {
                picker.selectedDate = date;
                picker.currentMonth = new Date(date);
            }
        }
    },

    /**
     * Render calendar
     */
    renderCalendar(picker) {
        const { currentMonth, config, selectedDate, selectedRange } = picker;
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

        // Header
        let html = `
            <div class="dp-header">
                <button type="button" class="dp-prev">‹</button>
                <span class="dp-title">${monthNames[month]} ${year}</span>
                <button type="button" class="dp-next">›</button>
            </div>
            <div class="dp-days-header">
                ${dayNames.map(d => `<span>${d}</span>`).join('')}
            </div>
            <div class="dp-days">
        `;

        // Get first day of month
        const firstDay = new Date(year, month, 1);
        const startDay = firstDay.getDay();

        // Get last day of month
        const lastDay = new Date(year, month + 1, 0);
        const totalDays = lastDay.getDate();

        // Previous month days
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonthDays - i;
            const date = new Date(year, month - 1, day);
            html += this.renderDay(date, picker, true);
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            html += this.renderDay(date, picker, false);
        }

        // Next month days
        const remainingDays = 42 - (startDay + totalDays);
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, month + 1, day);
            html += this.renderDay(date, picker, true);
        }

        html += '</div>';

        // Quick select buttons
        html += `
            <div class="dp-footer">
                <button type="button" class="dp-today">Today</button>
                <button type="button" class="dp-clear">Clear</button>
            </div>
        `;

        return html;
    },

    /**
     * Render single day
     */
    renderDay(date, picker, isOtherMonth) {
        const { config, selectedDate, selectedRange } = picker;
        const dateStr = this.formatDate(date, 'YYYY-MM-DD');
        const today = new Date();

        let classes = ['dp-day'];

        if (isOtherMonth) classes.push('other-month');
        if (this.isSameDay(date, today)) classes.push('today');
        if (selectedDate && this.isSameDay(date, selectedDate)) classes.push('selected');
        if (this.isDisabled(date, config)) classes.push('disabled');

        // Range selection
        if (config.range) {
            if (selectedRange.start && this.isSameDay(date, selectedRange.start)) {
                classes.push('range-start');
            }
            if (selectedRange.end && this.isSameDay(date, selectedRange.end)) {
                classes.push('range-end');
            }
            if (selectedRange.start && selectedRange.end &&
                date > selectedRange.start && date < selectedRange.end) {
                classes.push('in-range');
            }
        }

        return `<button type="button" class="${classes.join(' ')}" data-date="${dateStr}">${date.getDate()}</button>`;
    },

    /**
     * Check if date is disabled
     */
    isDisabled(date, config) {
        if (config.minDate && date < config.minDate) return true;
        if (config.maxDate && date > config.maxDate) return true;
        if (config.disabledDays.includes(date.getDay())) return true;

        const dateStr = this.formatDate(date, 'YYYY-MM-DD');
        if (config.disabledDates.includes(dateStr)) return true;

        return false;
    },

    /**
     * Select date
     */
    selectDate(picker, dateStr) {
        const date = this.parseDate(dateStr, 'YYYY-MM-DD');

        if (picker.config.range) {
            if (!picker.selectedRange.start || picker.selectedRange.end) {
                picker.selectedRange = { start: date, end: null };
            } else {
                if (date < picker.selectedRange.start) {
                    picker.selectedRange = { start: date, end: picker.selectedRange.start };
                } else {
                    picker.selectedRange.end = date;
                }
                const formatted = `${this.formatDate(picker.selectedRange.start, picker.config.format)} - ${this.formatDate(picker.selectedRange.end, picker.config.format)}`;
                picker.input.value = formatted;
                this.close(picker);
            }
        } else {
            picker.selectedDate = date;
            picker.input.value = this.formatDate(date, picker.config.format);
            this.close(picker);
        }

        this.refresh(picker);

        if (picker.config.onChange) {
            picker.config.onChange(picker.config.range ? picker.selectedRange : picker.selectedDate);
        }
    },

    /**
     * Navigate to previous month
     */
    prevMonth(picker) {
        picker.currentMonth.setMonth(picker.currentMonth.getMonth() - 1);
        this.refresh(picker);
    },

    /**
     * Navigate to next month
     */
    nextMonth(picker) {
        picker.currentMonth.setMonth(picker.currentMonth.getMonth() + 1);
        this.refresh(picker);
    },

    /**
     * Refresh calendar
     */
    refresh(picker) {
        picker.container.innerHTML = this.renderCalendar(picker);
    },

    /**
     * Open picker
     */
    open(picker) {
        if (picker.isOpen) return;

        const rect = picker.input.getBoundingClientRect();
        picker.container.style.top = `${rect.bottom + window.scrollY + 4}px`;
        picker.container.style.left = `${rect.left + window.scrollX}px`;
        picker.container.classList.add('open');
        picker.isOpen = true;

        if (picker.config.onOpen) picker.config.onOpen();
    },

    /**
     * Close picker
     */
    close(picker) {
        if (!picker.isOpen) return;

        picker.container.classList.remove('open');
        picker.isOpen = false;

        if (picker.config.onClose) picker.config.onClose();
    },

    /**
     * Toggle picker
     */
    toggle(picker) {
        if (picker.isOpen) {
            this.close(picker);
        } else {
            this.open(picker);
        }
    },

    /**
     * Format date
     */
    formatDate(date, format) {
        const pad = (n) => n.toString().padStart(2, '0');

        return format
            .replace('YYYY', date.getFullYear())
            .replace('MM', pad(date.getMonth() + 1))
            .replace('DD', pad(date.getDate()));
    },

    /**
     * Parse date
     */
    parseDate(str, format) {
        const parts = str.split(/[-/]/);
        const formatParts = format.split(/[-/]/);

        const indices = {
            YYYY: formatParts.indexOf('YYYY'),
            MM: formatParts.indexOf('MM'),
            DD: formatParts.indexOf('DD')
        };

        const year = parseInt(parts[indices.YYYY]);
        const month = parseInt(parts[indices.MM]) - 1;
        const day = parseInt(parts[indices.DD]);

        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

        return new Date(year, month, day);
    },

    /**
     * Check if same day
     */
    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    },

    /**
     * Destroy picker
     */
    destroy(inputId) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        const picker = this.instances.get(input);

        if (picker) {
            picker.container.remove();
            this.instances.delete(input);
        }
    }
};

// Styles
const datePickerStyles = document.createElement('style');
datePickerStyles.textContent = `
    .date-picker-dropdown {
        position: absolute;
        z-index: 1000;
        background: var(--bg-card);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        padding: var(--space-3);
        width: 280px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.2s ease;
    }
    
    .date-picker-dropdown.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
    
    .dp-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-3);
    }
    
    .dp-header button {
        width: 32px;
        height: 32px;
        border: none;
        background: var(--bg-surface);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 18px;
    }
    
    .dp-header button:hover {
        background: var(--color-primary-100);
    }
    
    .dp-title {
        font-weight: var(--font-semibold);
    }
    
    .dp-days-header {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-size: var(--text-xs);
        color: var(--text-muted);
        margin-bottom: var(--space-2);
    }
    
    .dp-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
    }
    
    .dp-day {
        width: 32px;
        height: 32px;
        border: none;
        background: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: var(--text-sm);
        transition: var(--transition-fast);
    }
    
    .dp-day:hover:not(.disabled) {
        background: var(--color-primary-50);
    }
    
    .dp-day.other-month {
        color: var(--text-muted);
        opacity: 0.5;
    }
    
    .dp-day.today {
        border: 2px solid var(--color-primary-300);
    }
    
    .dp-day.selected {
        background: var(--color-primary-500) !important;
        color: white;
    }
    
    .dp-day.disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
    
    .dp-day.in-range {
        background: var(--color-primary-100);
        border-radius: 0;
    }
    
    .dp-day.range-start {
        background: var(--color-primary-500);
        color: white;
        border-radius: var(--radius-md) 0 0 var(--radius-md);
    }
    
    .dp-day.range-end {
        background: var(--color-primary-500);
        color: white;
        border-radius: 0 var(--radius-md) var(--radius-md) 0;
    }
    
    .dp-footer {
        display: flex;
        gap: var(--space-2);
        margin-top: var(--space-3);
        padding-top: var(--space-3);
        border-top: 1px solid var(--border-light);
    }
    
    .dp-footer button {
        flex: 1;
        padding: var(--space-2);
        border: 1px solid var(--border-default);
        background: var(--bg-surface);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: var(--text-sm);
    }
    
    .dp-footer button:hover {
        background: var(--color-primary-50);
    }
`;

document.head.appendChild(datePickerStyles);

// Export
window.DatePicker = DatePicker;
