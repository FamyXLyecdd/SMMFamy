/**
 * SMMFamy - Tag Input Component
 * Multi-tag input with autocomplete | ~300 lines
 */

const TagInput = {
    instances: new Map(),

    /**
     * Create tag input
     */
    create(inputId, options = {}) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        if (!input) return null;

        const config = {
            placeholder: 'Add tags...',
            maxTags: Infinity,
            allowDuplicates: false,
            allowCustom: true,
            suggestions: [],
            delimiter: ',',
            minLength: 1,
            maxLength: 50,
            validateTag: null,
            onAdd: null,
            onRemove: null,
            onChange: null,
            ...options
        };

        const tagInput = {
            input,
            config,
            container: null,
            tagsContainer: null,
            hiddenInput: null,
            tags: [],
            suggestionsContainer: null,
            filteredSuggestions: [],
            selectedSuggestionIndex: -1
        };

        this.setup(tagInput);
        this.instances.set(input, tagInput);

        return tagInput;
    },

    /**
     * Setup tag input
     */
    setup(tagInput) {
        const { input, config } = tagInput;

        // Create wrapper structure
        tagInput.container = document.createElement('div');
        tagInput.container.className = 'tag-input-container';

        tagInput.tagsContainer = document.createElement('div');
        tagInput.tagsContainer.className = 'tags-container';

        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = 'tag-input-field';
        newInput.placeholder = config.placeholder;

        tagInput.hiddenInput = document.createElement('input');
        tagInput.hiddenInput.type = 'hidden';
        tagInput.hiddenInput.name = input.name || input.id;

        tagInput.suggestionsContainer = document.createElement('div');
        tagInput.suggestionsContainer.className = 'tag-suggestions';

        tagInput.container.appendChild(tagInput.tagsContainer);
        tagInput.container.appendChild(newInput);
        tagInput.container.appendChild(tagInput.hiddenInput);
        tagInput.container.appendChild(tagInput.suggestionsContainer);

        input.parentNode.replaceChild(tagInput.container, input);

        // Event listeners
        newInput.addEventListener('input', (e) => {
            this.handleInput(tagInput, e.target.value);
        });

        newInput.addEventListener('keydown', (e) => {
            this.handleKeydown(tagInput, e, newInput);
        });

        newInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideSuggestions(tagInput);
            }, 200);
        });

        tagInput.container.addEventListener('click', () => {
            newInput.focus();
        });

        // Load initial tags
        if (input.value) {
            input.value.split(config.delimiter).forEach(tag => {
                this.addTag(tagInput, tag.trim());
            });
        }
    },

    /**
     * Handle input
     */
    handleInput(tagInput, value) {
        const { config } = tagInput;

        if (config.suggestions.length > 0 && value.length >= 1) {
            tagInput.filteredSuggestions = config.suggestions.filter(s =>
                s.toLowerCase().includes(value.toLowerCase()) &&
                !tagInput.tags.includes(s)
            ).slice(0, 10);

            this.showSuggestions(tagInput);
        } else {
            this.hideSuggestions(tagInput);
        }
    },

    /**
     * Handle keydown
     */
    handleKeydown(tagInput, e, input) {
        const { config, filteredSuggestions, selectedSuggestionIndex } = tagInput;

        switch (e.key) {
            case 'Enter':
            case 'Tab':
            case config.delimiter:
                e.preventDefault();

                if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
                    this.addTag(tagInput, filteredSuggestions[selectedSuggestionIndex]);
                } else if (input.value.trim() && config.allowCustom) {
                    this.addTag(tagInput, input.value.trim());
                }

                input.value = '';
                this.hideSuggestions(tagInput);
                break;

            case 'Backspace':
                if (!input.value && tagInput.tags.length > 0) {
                    this.removeTag(tagInput, tagInput.tags.length - 1);
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                tagInput.selectedSuggestionIndex = Math.min(
                    selectedSuggestionIndex + 1,
                    filteredSuggestions.length - 1
                );
                this.updateSuggestionSelection(tagInput);
                break;

            case 'ArrowUp':
                e.preventDefault();
                tagInput.selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                this.updateSuggestionSelection(tagInput);
                break;

            case 'Escape':
                this.hideSuggestions(tagInput);
                break;
        }
    },

    /**
     * Add tag
     */
    addTag(tagInput, value) {
        const { config, tags, tagsContainer, hiddenInput } = tagInput;

        // Validate
        if (!value || value.length < config.minLength) return false;
        if (value.length > config.maxLength) return false;
        if (!config.allowDuplicates && tags.includes(value)) return false;
        if (tags.length >= config.maxTags) return false;
        if (config.validateTag && !config.validateTag(value)) return false;

        // Add to array
        tags.push(value);

        // Create tag element
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.innerHTML = `
            ${value}
            <button type="button" class="tag-remove">&times;</button>
        `;

        tagEl.querySelector('.tag-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            const index = tags.indexOf(value);
            this.removeTag(tagInput, index);
        });

        tagsContainer.appendChild(tagEl);

        // Update hidden input
        hiddenInput.value = tags.join(config.delimiter);

        // Callbacks
        if (config.onAdd) config.onAdd(value, tags);
        if (config.onChange) config.onChange(tags);

        return true;
    },

    /**
     * Remove tag
     */
    removeTag(tagInput, index) {
        const { config, tags, tagsContainer, hiddenInput } = tagInput;

        if (index < 0 || index >= tags.length) return;

        const value = tags[index];
        tags.splice(index, 1);

        const tagEls = tagsContainer.querySelectorAll('.tag');
        if (tagEls[index]) {
            tagEls[index].remove();
        }

        // Update hidden input
        hiddenInput.value = tags.join(config.delimiter);

        // Callbacks
        if (config.onRemove) config.onRemove(value, tags);
        if (config.onChange) config.onChange(tags);
    },

    /**
     * Show suggestions
     */
    showSuggestions(tagInput) {
        const { suggestionsContainer, filteredSuggestions } = tagInput;

        if (filteredSuggestions.length === 0) {
            this.hideSuggestions(tagInput);
            return;
        }

        suggestionsContainer.innerHTML = filteredSuggestions.map((s, i) => `
            <div class="tag-suggestion" data-index="${i}">${s}</div>
        `).join('');

        suggestionsContainer.classList.add('open');

        // Click to select
        suggestionsContainer.querySelectorAll('.tag-suggestion').forEach(el => {
            el.addEventListener('click', () => {
                this.addTag(tagInput, filteredSuggestions[parseInt(el.dataset.index)]);
                tagInput.container.querySelector('.tag-input-field').value = '';
                this.hideSuggestions(tagInput);
            });
        });

        tagInput.selectedSuggestionIndex = -1;
    },

    /**
     * Hide suggestions
     */
    hideSuggestions(tagInput) {
        tagInput.suggestionsContainer.classList.remove('open');
        tagInput.selectedSuggestionIndex = -1;
    },

    /**
     * Update suggestion selection
     */
    updateSuggestionSelection(tagInput) {
        const items = tagInput.suggestionsContainer.querySelectorAll('.tag-suggestion');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === tagInput.selectedSuggestionIndex);
        });
    },

    /**
     * Get tags
     */
    getTags(inputId) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        const tagInput = this.instances.get(input);
        return tagInput ? [...tagInput.tags] : [];
    },

    /**
     * Set tags
     */
    setTags(inputId, tags) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        const tagInput = this.instances.get(input);
        if (!tagInput) return;

        this.clearTags(inputId);
        tags.forEach(tag => this.addTag(tagInput, tag));
    },

    /**
     * Clear all tags
     */
    clearTags(inputId) {
        const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        const tagInput = this.instances.get(input);
        if (!tagInput) return;

        tagInput.tags = [];
        tagInput.tagsContainer.innerHTML = '';
        tagInput.hiddenInput.value = '';
    }
};

// Styles
const tagStyles = document.createElement('style');
tagStyles.textContent = `
    .tag-input-container {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        padding: var(--space-2);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        background: var(--bg-card);
        cursor: text;
        position: relative;
    }
    
    .tag-input-container:focus-within {
        border-color: var(--color-primary-400);
        box-shadow: 0 0 0 3px var(--color-primary-100);
    }
    
    .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1);
    }
    
    .tag {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-1) var(--space-2);
        background: var(--color-primary-100);
        color: var(--color-primary-700);
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
    }
    
    .tag-remove {
        background: none;
        border: none;
        padding: 0;
        width: 16px;
        height: 16px;
        font-size: 14px;
        cursor: pointer;
        opacity: 0.6;
    }
    
    .tag-remove:hover {
        opacity: 1;
    }
    
    .tag-input-field {
        flex: 1;
        min-width: 100px;
        border: none;
        outline: none;
        background: transparent;
        font-size: var(--text-base);
        padding: var(--space-1);
    }
    
    .tag-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-card);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        margin-top: var(--space-1);
        max-height: 200px;
        overflow-y: auto;
        z-index: 100;
        display: none;
    }
    
    .tag-suggestions.open {
        display: block;
    }
    
    .tag-suggestion {
        padding: var(--space-2) var(--space-3);
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .tag-suggestion:hover,
    .tag-suggestion.selected {
        background: var(--bg-surface);
    }
`;

document.head.appendChild(tagStyles);

// Export
window.TagInput = TagInput;
