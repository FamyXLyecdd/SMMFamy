/**
 * SMMFamy - Data Tables Component
 * Advanced data table with sorting, filtering, pagination | ~500 lines
 */

const DataTable = {
    instances: new Map(),

    /**
     * Create data table instance
     */
    create(elementId, options = {}) {
        const defaults = {
            data: [],
            columns: [],
            pageSize: 10,
            pageSizes: [10, 25, 50, 100],
            sortable: true,
            filterable: true,
            selectable: false,
            multiSelect: false,
            striped: true,
            hover: true,
            bordered: true,
            responsive: true,
            emptyMessage: 'No data available',
            loadingMessage: 'Loading...',
            showPagination: true,
            showSearch: true,
            showInfo: true,
            onRowClick: null,
            onSelectionChange: null,
            onSort: null,
            onFilter: null,
            onPageChange: null
        };

        const config = { ...defaults, ...options };
        const container = document.getElementById(elementId);

        if (!container) {
            console.error('DataTable container not found:', elementId);
            return null;
        }

        const table = {
            id: elementId,
            container,
            config,
            state: {
                data: [...config.data],
                filteredData: [...config.data],
                page: 1,
                pageSize: config.pageSize,
                sortColumn: null,
                sortDirection: 'asc',
                searchQuery: '',
                selected: new Set(),
                loading: false
            },

            /**
             * Render the table
             */
            render() {
                const { columns, showSearch, showPagination, showInfo, responsive } = this.config;
                const { filteredData, page, pageSize, sortColumn, sortDirection, searchQuery, loading } = this.state;

                // Calculate pagination
                const totalItems = filteredData.length;
                const totalPages = Math.ceil(totalItems / pageSize);
                const startIndex = (page - 1) * pageSize;
                const endIndex = Math.min(startIndex + pageSize, totalItems);
                const pageData = filteredData.slice(startIndex, endIndex);

                // Build HTML
                let html = '';

                // Search bar
                if (showSearch) {
                    html += `
                        <div class="datatable-header">
                            <div class="datatable-search">
                                <input type="text" class="form-input" placeholder="Search..." 
                                       value="${Utils.escapeHtml(searchQuery)}" 
                                       id="${this.id}-search">
                            </div>
                            <div class="datatable-page-size">
                                <select class="form-select" id="${this.id}-pagesize">
                                    ${this.config.pageSizes.map(size =>
                        `<option value="${size}" ${size === pageSize ? 'selected' : ''}>${size} per page</option>`
                    ).join('')}
                                </select>
                            </div>
                        </div>
                    `;
                }

                // Table wrapper
                html += `<div class="datatable-wrapper ${responsive ? 'datatable-responsive' : ''}">`;

                if (loading) {
                    html += `<div class="datatable-loading">${this.config.loadingMessage}</div>`;
                } else {
                    html += `<table class="table ${this.config.striped ? 'table-striped' : ''} ${this.config.hover ? 'table-hover' : ''} ${this.config.bordered ? 'table-bordered' : ''}">`;

                    // Header
                    html += '<thead><tr>';

                    if (this.config.selectable) {
                        html += `
                            <th class="datatable-select-column" style="width: 40px;">
                                ${this.config.multiSelect ? `
                                    <input type="checkbox" class="form-check-input" id="${this.id}-select-all"
                                           ${this.state.selected.size === pageData.length && pageData.length > 0 ? 'checked' : ''}>
                                ` : ''}
                            </th>
                        `;
                    }

                    for (const col of columns) {
                        const isSorted = sortColumn === col.key;
                        const sortIcon = isSorted ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
                        const sortable = this.config.sortable && col.sortable !== false;

                        html += `
                            <th class="${sortable ? 'datatable-sortable' : ''}" 
                                data-column="${col.key}"
                                style="${col.width ? `width: ${col.width}` : ''}">
                                ${col.title}${sortIcon}
                            </th>
                        `;
                    }

                    html += '</tr></thead>';

                    // Body
                    html += '<tbody>';

                    if (pageData.length === 0) {
                        html += `
                            <tr class="datatable-empty">
                                <td colspan="${columns.length + (this.config.selectable ? 1 : 0)}">
                                    ${this.config.emptyMessage}
                                </td>
                            </tr>
                        `;
                    } else {
                        for (const [index, row] of pageData.entries()) {
                            const rowId = row.id || index;
                            const isSelected = this.state.selected.has(rowId);

                            html += `
                                <tr data-row-id="${rowId}" class="${isSelected ? 'datatable-selected' : ''}">
                            `;

                            if (this.config.selectable) {
                                html += `
                                    <td class="datatable-select-column">
                                        <input type="checkbox" class="form-check-input datatable-row-select" 
                                               data-row-id="${rowId}" ${isSelected ? 'checked' : ''}>
                                    </td>
                                `;
                            }

                            for (const col of columns) {
                                let value = this.getValue(row, col.key);

                                if (col.render) {
                                    value = col.render(value, row, index);
                                } else if (col.format) {
                                    value = this.formatValue(value, col.format);
                                } else {
                                    value = Utils.escapeHtml(String(value ?? ''));
                                }

                                html += `<td class="${col.className || ''}">${value}</td>`;
                            }

                            html += '</tr>';
                        }
                    }

                    html += '</tbody></table>';
                }

                html += '</div>'; // End wrapper

                // Footer with pagination
                if (showPagination || showInfo) {
                    html += '<div class="datatable-footer">';

                    if (showInfo) {
                        html += `
                            <div class="datatable-info">
                                Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries
                            </div>
                        `;
                    }

                    if (showPagination && totalPages > 1) {
                        html += `
                            <div class="datatable-pagination">
                                <button class="btn btn-sm btn-secondary" 
                                        id="${this.id}-prev" ${page === 1 ? 'disabled' : ''}>Previous</button>
                                
                                <span class="datatable-page-info">
                                    Page ${page} of ${totalPages}
                                </span>
                                
                                <button class="btn btn-sm btn-secondary" 
                                        id="${this.id}-next" ${page === totalPages ? 'disabled' : ''}>Next</button>
                            </div>
                        `;
                    }

                    html += '</div>';
                }

                this.container.innerHTML = html;
                this.attachEvents();
            },

            /**
             * Get nested value from object
             */
            getValue(obj, path) {
                return path.split('.').reduce((o, k) => (o || {})[k], obj);
            },

            /**
             * Format value based on type
             */
            formatValue(value, format) {
                switch (format) {
                    case 'date':
                        return Utils.formatDate(value);
                    case 'datetime':
                        return Utils.formatDate(value, 'datetime');
                    case 'relative':
                        return Utils.formatRelativeTime(value);
                    case 'number':
                        return Utils.formatNumber(value);
                    case 'currency':
                        return SMMApi.formatPrice(value);
                    case 'percent':
                        return value + '%';
                    default:
                        return value;
                }
            },

            /**
             * Attach event listeners
             */
            attachEvents() {
                // Search
                const searchInput = document.getElementById(`${this.id}-search`);
                if (searchInput) {
                    searchInput.addEventListener('input', Utils.debounce(e => {
                        this.search(e.target.value);
                    }, 300));
                }

                // Page size
                const pageSizeSelect = document.getElementById(`${this.id}-pagesize`);
                if (pageSizeSelect) {
                    pageSizeSelect.addEventListener('change', e => {
                        this.setPageSize(parseInt(e.target.value));
                    });
                }

                // Pagination
                const prevBtn = document.getElementById(`${this.id}-prev`);
                const nextBtn = document.getElementById(`${this.id}-next`);

                if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
                if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());

                // Sortable headers
                this.container.querySelectorAll('.datatable-sortable').forEach(th => {
                    th.addEventListener('click', () => {
                        const column = th.dataset.column;
                        this.sort(column);
                    });
                });

                // Row selection
                if (this.config.selectable) {
                    // Select all
                    const selectAllCheckbox = document.getElementById(`${this.id}-select-all`);
                    if (selectAllCheckbox) {
                        selectAllCheckbox.addEventListener('change', e => {
                            this.selectAll(e.target.checked);
                        });
                    }

                    // Individual row select
                    this.container.querySelectorAll('.datatable-row-select').forEach(checkbox => {
                        checkbox.addEventListener('change', e => {
                            const rowId = e.target.dataset.rowId;
                            this.toggleSelection(rowId);
                        });
                    });
                }

                // Row click
                if (this.config.onRowClick) {
                    this.container.querySelectorAll('tbody tr[data-row-id]').forEach(tr => {
                        tr.addEventListener('click', e => {
                            if (e.target.type !== 'checkbox') {
                                const rowId = tr.dataset.rowId;
                                const rowData = this.getRowById(rowId);
                                this.config.onRowClick(rowData, tr);
                            }
                        });
                    });
                }
            },

            /**
             * Search data
             */
            search(query) {
                this.state.searchQuery = query.toLowerCase();
                this.state.page = 1;
                this.applyFilters();
                this.render();

                if (this.config.onFilter) {
                    this.config.onFilter(query, this.state.filteredData);
                }
            },

            /**
             * Apply filters to data
             */
            applyFilters() {
                const { searchQuery } = this.state;
                const { columns } = this.config;

                if (!searchQuery) {
                    this.state.filteredData = [...this.state.data];
                    return;
                }

                this.state.filteredData = this.state.data.filter(row => {
                    return columns.some(col => {
                        if (col.searchable === false) return false;
                        const value = this.getValue(row, col.key);
                        return String(value || '').toLowerCase().includes(searchQuery);
                    });
                });
            },

            /**
             * Sort data
             */
            sort(column) {
                const { sortColumn, sortDirection } = this.state;

                if (sortColumn === column) {
                    this.state.sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.state.sortColumn = column;
                    this.state.sortDirection = 'asc';
                }

                this.state.filteredData.sort((a, b) => {
                    const valA = this.getValue(a, column);
                    const valB = this.getValue(b, column);

                    let comparison = 0;
                    if (valA < valB) comparison = -1;
                    if (valA > valB) comparison = 1;

                    return this.state.sortDirection === 'asc' ? comparison : -comparison;
                });

                this.render();

                if (this.config.onSort) {
                    this.config.onSort(column, this.state.sortDirection);
                }
            },

            /**
             * Set page size
             */
            setPageSize(size) {
                this.state.pageSize = size;
                this.state.page = 1;
                this.render();
            },

            /**
             * Go to specific page
             */
            goToPage(page) {
                const totalPages = Math.ceil(this.state.filteredData.length / this.state.pageSize);
                this.state.page = Math.max(1, Math.min(page, totalPages));
                this.render();

                if (this.config.onPageChange) {
                    this.config.onPageChange(this.state.page);
                }
            },

            /**
             * Go to previous page
             */
            prevPage() {
                this.goToPage(this.state.page - 1);
            },

            /**
             * Go to next page
             */
            nextPage() {
                this.goToPage(this.state.page + 1);
            },

            /**
             * Toggle row selection
             */
            toggleSelection(rowId) {
                if (this.state.selected.has(rowId)) {
                    this.state.selected.delete(rowId);
                } else {
                    if (!this.config.multiSelect) {
                        this.state.selected.clear();
                    }
                    this.state.selected.add(rowId);
                }

                this.render();

                if (this.config.onSelectionChange) {
                    this.config.onSelectionChange(this.getSelected());
                }
            },

            /**
             * Select all rows
             */
            selectAll(select) {
                if (select) {
                    const startIndex = (this.state.page - 1) * this.state.pageSize;
                    const endIndex = startIndex + this.state.pageSize;
                    const pageData = this.state.filteredData.slice(startIndex, endIndex);

                    pageData.forEach((row, index) => {
                        const rowId = row.id || index;
                        this.state.selected.add(String(rowId));
                    });
                } else {
                    this.state.selected.clear();
                }

                this.render();

                if (this.config.onSelectionChange) {
                    this.config.onSelectionChange(this.getSelected());
                }
            },

            /**
             * Get selected rows
             */
            getSelected() {
                return this.state.data.filter(row => {
                    const rowId = row.id || this.state.data.indexOf(row);
                    return this.state.selected.has(String(rowId));
                });
            },

            /**
             * Get row by ID
             */
            getRowById(rowId) {
                return this.state.data.find((row, index) => {
                    const id = row.id || index;
                    return String(id) === String(rowId);
                });
            },

            /**
             * Set loading state
             */
            setLoading(loading) {
                this.state.loading = loading;
                this.render();
            },

            /**
             * Update data
             */
            setData(data) {
                this.state.data = [...data];
                this.state.selected.clear();
                this.applyFilters();
                this.render();
            },

            /**
             * Add row
             */
            addRow(row) {
                this.state.data.push(row);
                this.applyFilters();
                this.render();
            },

            /**
             * Remove row by ID
             */
            removeRow(rowId) {
                this.state.data = this.state.data.filter((row, index) => {
                    const id = row.id || index;
                    return String(id) !== String(rowId);
                });
                this.state.selected.delete(String(rowId));
                this.applyFilters();
                this.render();
            },

            /**
             * Update row
             */
            updateRow(rowId, newData) {
                const index = this.state.data.findIndex((row, i) => {
                    const id = row.id || i;
                    return String(id) === String(rowId);
                });

                if (index !== -1) {
                    this.state.data[index] = { ...this.state.data[index], ...newData };
                    this.applyFilters();
                    this.render();
                }
            },

            /**
             * Refresh table
             */
            refresh() {
                this.applyFilters();
                this.render();
            },

            /**
             * Destroy table instance
             */
            destroy() {
                this.container.innerHTML = '';
                DataTable.instances.delete(this.id);
            }
        };

        // Initial render
        table.render();

        // Store instance
        this.instances.set(elementId, table);

        return table;
    },

    /**
     * Get table instance by ID
     */
    getInstance(elementId) {
        return this.instances.get(elementId);
    }
};

// Export for use
window.DataTable = DataTable;
