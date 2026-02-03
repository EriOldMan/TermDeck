    let entries = [];
    let currentFilter = 'all';
    let selectedColor = 'blue';
    let currentEntryTags = [];
    let editingIndex = null;
    let termMatches = [];
    let termDropdownIndex = -1;
    let tagMatches = [];
    let tagDropdownIndex = -1;
    let translationMatches = [];
    let translationDropdownIndex = -1;
    let tagEditSelectedColor = null;
    let tagEditSuppressBlurCommit = false;

    // Load saved entries
    function loadEntries() {
        try {
            const saved = localStorage.getItem("vocab_entries");
            if (saved) {
                entries = JSON.parse(saved);
                // Migration to multi-tags
                entries.forEach(e => {
                    if (!e.tags) {
                        if (e.tag) {
                            e.tags = [{ text: e.tag, color: e.color || 'blue' }];
                        } else {
                            e.tags = [];
                        }
                        delete e.tag;
                        delete e.color;
                    }
                });
                renderList();
            }
        } catch (error) {
            console.log("Loading entries:", error);
        }
    }

    function addTag(text = null, color = null) {
        const rawInput = text || document.getElementById("tagInput").value;
        if (!rawInput) return;
        
        const tags = rawInput.split(',').map(t => t.trim()).filter(t => t);
        if (tags.length === 0) return;

        const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];
        const useRandomColor = tags.length > 1;

        tags.forEach(tagText => {
            if (currentEntryTags.some(t => t.text === tagText)) return;
            
            let tagColor;
            if (color) {
                tagColor = color;
            } else if (useRandomColor) {
                tagColor = colors[Math.floor(Math.random() * colors.length)];
            } else {
                tagColor = selectedColor;
            }
            
            currentEntryTags.push({
                text: tagText,
                color: tagColor
            });
        });
        
        renderActiveTags();
        document.getElementById("tagInput").value = "";
        document.getElementById("tagInput").focus();
    }

    function removeTag(index) {
        currentEntryTags.splice(index, 1);
        renderActiveTags();
    }

    function renderActiveTags() {
        const container = document.getElementById("activeTags");
        container.innerHTML = "";
        currentEntryTags.forEach((t, i) => {
            const tag = document.createElement("span");
            tag.className = `tag ${t.color}`;
            tag.innerHTML = `${escapeHtml(t.text)} <span style="cursor:pointer;margin-left:4px;opacity:0.8" onclick="removeTag(${i})">×</span>`;
            container.appendChild(tag);
        });
    }

    async function addItem() {
        const term = document.getElementById("termInput").value.trim();
        const translation = document.getElementById("translationInput").value.trim();
        
        const pendingTag = document.getElementById("tagInput").value.trim();
        if (pendingTag) {
            addTag(pendingTag);
        }
        
        if (!term || !translation) return;
        
        // Prepare new entry object
        const newEntry = { term, translation, tags: [...currentEntryTags] };

        if (editingIndex !== null) {
            // Update existing entry
            entries[editingIndex] = newEntry;
            entries.sort((a, b) => a.term.localeCompare(b.term));
            editingIndex = null;
            document.querySelector('button[onclick="addItem()"]').textContent = "➕";
            finishAddItem();
        } else {
            // Check for duplicates
            const existingIndex = entries.findIndex(e => 
                e.term.toLowerCase() === term.toLowerCase() && 
                e.translation.toLowerCase() === translation.toLowerCase()
            );

            if (existingIndex !== -1) {
                const existing = entries[existingIndex];
                
                // Compare tags
                const existingTags = existing.tags ? existing.tags.map(t => t.text).sort().join('|') : '';
                const newTags = newEntry.tags ? newEntry.tags.map(t => t.text).sort().join('|') : '';
                
                if (existingTags === newTags) {
                    // Exact duplicate: ignore
                    alert("This entry already exists exactly as is!");
                    finishAddItem(); // Clear inputs
                    return;
                } else {
                    // Conflict: Show modal
                    showManualCollisionModal(existingIndex, newEntry);
                    return;
                }
            }

            // Add new entry
            entries.push(newEntry);
            entries.sort((a, b) => a.term.localeCompare(b.term));
            finishAddItem();
        }
    }
    
    function finishAddItem() {
        saveEntries();

        document.getElementById("termInput").value = "";
        document.getElementById("translationInput").value = "";
        document.getElementById("tagInput").value = "";
        currentEntryTags = [];
        renderActiveTags();
        selectColor('blue');
        renderList();
        renderFilters();
        document.getElementById("termInput").focus();
    }
    
    let manualCollisionState = null;

    function showManualCollisionModal(existingIndex, newEntry) {
        manualCollisionState = { existingIndex, newEntry };
        const existing = entries[existingIndex];
        
        document.getElementById('manualCollisionTerm').textContent = existing.term;
        document.getElementById('manualExistingEntryDetails').innerHTML = formatEntryDetails(existing);
        document.getElementById('manualNewEntryDetails').innerHTML = formatEntryDetails(newEntry);
        
        document.getElementById('manualCollisionModal').style.display = 'flex';
    }
    
    function resolveManualCollision(action) {
        if (!manualCollisionState) return;
        const { existingIndex, newEntry } = manualCollisionState;
        
        if (action === 'overwrite') {
            entries[existingIndex] = newEntry;
            entries.sort((a, b) => a.term.localeCompare(b.term));
        } else if (action === 'merge') {
            // Merge tags: add new tags to existing tags if they don't exist
            const existing = entries[existingIndex];
            newEntry.tags.forEach(newTag => {
                if (!existing.tags.some(t => t.text === newTag.text)) {
                    existing.tags.push(newTag);
                }
            });
            // Update the entry in list (no need to sort as term/trans didn't change)
        } else {
            // Cancel - do nothing to entries, just close modal
             document.getElementById('manualCollisionModal').style.display = 'none';
             return; // Don't clear inputs so user can edit
        }
        
        document.getElementById('manualCollisionModal').style.display = 'none';
        finishAddItem();
    }

    async function deleteItem(index) {
        // If we're editing this item, cancel the edit
        if (editingIndex === index) {
            cancelEdit();
        }
        
        entries.splice(index, 1);
        saveEntries();
        renderList();
        renderFilters();
    }
    
    function editItem(index) {
        editingIndex = index;
        const entry = entries[index];
        
        document.getElementById("termInput").value = entry.term;
        document.getElementById("translationInput").value = entry.translation;
        document.getElementById("tagInput").value = "";
        
        currentEntryTags = entry.tags ? JSON.parse(JSON.stringify(entry.tags)) : [];
        renderActiveTags();
        
        selectColor('blue');
        
        // Change button text to indicate editing mode
        document.querySelector('button[onclick="addItem()"]').textContent = "💾 Update";
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Focus on term input
        document.getElementById("termInput").focus();
    }
    
    function cancelEdit() {
        editingIndex = null;
        document.getElementById("termInput").value = "";
        document.getElementById("translationInput").value = "";
        document.getElementById("tagInput").value = "";
        currentEntryTags = [];
        renderActiveTags();
        selectColor('blue');
        document.querySelector('button[onclick="addItem()"]').textContent = "➕";
    }

    function saveEntries() {
        try {
            localStorage.setItem("vocab_entries", JSON.stringify(entries));
            console.log("Saved successfully");
        } catch (error) {
            console.error("Error saving:", error);
        }
    }

    function renderList() {
        const list = document.getElementById("list");
        list.innerHTML = "";

        const filteredEntries = currentFilter === 'all' 
            ? entries 
            : entries.filter(e => e.tags.some(t => t.text === currentFilter));

        if (filteredEntries.length === 0) {
            list.innerHTML = "<div class='empty-state'>🔍 No vocabulary entries found.</div>";
            return;
        }

        filteredEntries.forEach((e) => {
            const originalIndex = entries.indexOf(e);
            const div = document.createElement("div");
            div.className = "item";
            div.id = `item-${originalIndex}`;
            
            const tagsHtml = e.tags && e.tags.length > 0
                ? e.tags.map(t => `<span class="tag ${t.color}">${escapeHtml(t.text)}</span>`).join('')
                : '';
            
            div.innerHTML = `
                <span>
                    <span class="term">${escapeHtml(e.term)}</span> : ${escapeHtml(e.translation)}
                    ${tagsHtml}
                </span>
                <div class="button-group">
                    <button class="edit-btn" onclick="editItem(${originalIndex})">✏️</button>
                    <button onclick="deleteItem(${originalIndex})">🗑️</button>
                </div>
            `;
            list.appendChild(div);
        });
    }
    
    function renderFilters() {
        const filterContainer = document.getElementById("filterContainer");
        const uniqueTags = new Map();
        entries.forEach(e => {
            if (e.tags) {
                e.tags.forEach(t => {
                     if (!uniqueTags.has(t.text)) {
                         uniqueTags.set(t.text, t.color);
                     }
                });
            }
        });
        
        if (uniqueTags.size === 0) {
            filterContainer.innerHTML = "";
            return;
        }
        
        filterContainer.innerHTML = "";
        const allDiv = document.createElement("div");
        allDiv.className = `filter-tag all ${currentFilter === 'all' ? 'active' : ''}`;
        allDiv.textContent = `All (${entries.length})`;
        allDiv.onclick = () => filterByTag('all');
        filterContainer.appendChild(allDiv);

        if (currentFilter !== 'all') {
            const editControl = document.createElement("div");
            editControl.textContent = "✏️";
            editControl.style.cursor = "pointer";
            editControl.style.padding = "6px 14px";
            editControl.style.borderRadius = "20px";
            editControl.style.fontSize = "13px";
            editControl.style.fontWeight = "600";
            editControl.onclick = () => beginTagInlineEdit();
            filterContainer.appendChild(editControl);
        }
        
        // Add Clear Button if there are entries to clear
        const filteredCount = currentFilter === 'all' 
            ? entries.length 
            : entries.filter(e => e.tags.some(t => t.text === currentFilter)).length;
            
        if (filteredCount > 0) {
            const clearBtn = document.createElement("div");
            clearBtn.textContent = "🗑️ Clear Tab";
            clearBtn.style.cursor = "pointer";
            clearBtn.style.padding = "6px 14px";
            clearBtn.style.borderRadius = "20px";
            clearBtn.style.fontSize = "13px";
            clearBtn.style.fontWeight = "600";
            clearBtn.style.marginLeft = "auto"; // Push to right
            clearBtn.style.color = "#ff4757";
            clearBtn.style.background = "rgba(255, 71, 87, 0.1)";
            clearBtn.onclick = () => showClearConfirm();
            filterContainer.appendChild(clearBtn);
        }
        
        uniqueTags.forEach((color, tag) => {
            const count = entries.filter(e => e.tags.some(t => t.text === tag)).length;
            if (currentFilter === tag && tagEditMode) {
                const editDiv = document.createElement("div");
                editDiv.className = `filter-tag ${color} active`;
                const input = document.createElement("input");
                input.id = "tagEditInline";
                input.value = tag;
                input.style.padding = "6px 10px";
                input.style.borderRadius = "12px";
                input.style.border = "2px solid white";
                input.style.fontWeight = "600";
                input.style.fontSize = "13px";
                input.onkeydown = (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        commitTagInlineEdit();
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelTagInlineEdit();
                    }
                };
                input.onblur = () => {
                    if (tagEditSuppressBlurCommit) {
                        tagEditSuppressBlurCommit = false;
                        setTimeout(() => input.focus(), 0);
                        return;
                    }
                    commitTagInlineEdit();
                };
                const colorPicker = document.createElement("div");
                colorPicker.className = "color-picker";
                // Inline color picker style tweak for compactness
                colorPicker.style.display = "inline-flex"; 
                colorPicker.style.marginLeft = "8px";
                colorPicker.style.padding = "0";
                colorPicker.style.background = "transparent";
                
                const colors = ["blue","red","green","yellow","purple","orange","pink","teal"];
                colors.forEach(c => {
                    const opt = document.createElement("div");
                    opt.className = "color-option " + c + (tagEditSelectedColor === c ? " selected" : "");
                    // Make them smaller for inline
                    opt.style.width = "20px";
                    opt.style.height = "20px";
                    opt.style.borderWidth = "2px";
                    
                    opt.onmousedown = (e) => {
                        e.preventDefault();
                        tagEditSuppressBlurCommit = true;
                    };
                    opt.onclick = () => {
                        tagEditSelectedColor = c;
                        Array.from(colorPicker.querySelectorAll(".color-option")).forEach(o => o.classList.remove("selected"));
                        opt.classList.add("selected");
                        tagEditSuppressBlurCommit = false;
                        input.focus();
                    };
                    colorPicker.appendChild(opt);
                });
                editDiv.appendChild(input);
                editDiv.appendChild(colorPicker);
                filterContainer.appendChild(editDiv);
                setTimeout(() => input.focus(), 0);
            } else {
                const filterDiv = document.createElement("div");
                filterDiv.className = `filter-tag ${color} ${currentFilter === tag ? 'active' : ''}`;
                filterDiv.textContent = `${tag} (${count})`;
                filterDiv.onclick = () => filterByTag(tag);
                filterContainer.appendChild(filterDiv);
            }
        });
    }
    
    function filterByTag(tag) {
        currentFilter = tag;
        renderList();
        renderFilters();
    }
    
    function selectColor(color) {
        selectedColor = color;
        
        // Update UI
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`.color-option[data-color="${color}"]`).classList.add('selected');
    }
    
    function renameTag(oldTag, newTag, newColor) {
        entries.forEach(e => {
            if (e.tags) {
                e.tags.forEach(t => {
                    if (t.text === oldTag) {
                        t.text = newTag;
                        t.color = newColor;
                    }
                });
            }
        });
        
        if (currentFilter === oldTag) currentFilter = newTag;
        
        // Update active tags in edit mode too
        currentEntryTags.forEach(t => {
            if (t.text === oldTag) {
                t.text = newTag;
                t.color = newColor;
            }
        });
        renderActiveTags();
        
        entries.sort((a, b) => a.term.localeCompare(b.term));
        saveEntries();
        renderList();
        renderFilters();
        handleTagSearch();
    }
    
    let tagEditMode = false;
    function beginTagInlineEdit() {
        if (currentFilter === 'all') return;
        let foundColor = 'blue';
        for (const e of entries) {
            const t = e.tags.find(t => t.text === currentFilter);
            if (t) {
                foundColor = t.color;
                break;
            }
        }
        tagEditSelectedColor = foundColor;
        tagEditMode = true;
        renderFilters();
    }
    function commitTagInlineEdit() {
        const input = document.getElementById("tagEditInline");
        if (!input) { tagEditMode = false; renderFilters(); return; }
        const newTag = input.value.trim();
        if (!newTag) { tagEditMode = false; renderFilters(); return; }
        const oldTag = currentFilter;
        const newColor = tagEditSelectedColor || 'blue';
        tagEditMode = false;
        renameTag(oldTag, newTag, newColor);
    }
    function cancelTagInlineEdit() {
        tagEditMode = false;
        renderFilters();
    }
    
    function showClearConfirm() {
        const filteredCount = currentFilter === 'all' 
            ? entries.length 
            : entries.filter(e => e.tags.some(t => t.text === currentFilter)).length;
            
        document.getElementById('clearCount').textContent = filteredCount;
        document.getElementById('clearTagName').textContent = currentFilter === 'all' ? 'All Items' : currentFilter;
        document.getElementById('clearConfirmModal').style.display = 'flex';
    }

    function confirmClearTab() {
        if (currentFilter === 'all') {
            entries = [];
        } else {
            // Remove entries that have the current tag
            entries = entries.filter(e => !e.tags.some(t => t.text === currentFilter));
        }
        
        saveEntries();
        renderList();
        renderFilters(); // This will re-render tabs, effectively updating counts
        document.getElementById('clearConfirmModal').style.display = 'none';
    }

    function handleTagSearch() {
        const rawValue = document.getElementById("tagInput").value;
        const parts = rawValue.split(',');
        const searchTerm = parts[parts.length - 1].trim().toLowerCase();
        const dropdown = document.getElementById("tagDropdown");
        
        if (!searchTerm) {
            dropdown.style.display = "none";
            tagDropdownIndex = -1;
            return;
        }
        
        // Get unique tags with their colors
        const uniqueTags = new Map();
        entries.forEach(e => {
            if (e.tags) {
                e.tags.forEach(t => {
                     if (!uniqueTags.has(t.text)) {
                         uniqueTags.set(t.text, t.color);
                     }
                });
            }
        });
        
        // Filter tags that match search
        const matches = Array.from(uniqueTags.entries()).filter(([tag]) => 
            tag.toLowerCase().includes(searchTerm)
        );
        
        if (matches.length === 0) {
            dropdown.style.display = "none";
            tagDropdownIndex = -1;
            return;
        }
        
        dropdown.innerHTML = "";
        tagDropdownIndex = -1;
        matches.forEach(([tag, color]) => {
            const div = document.createElement("div");
            div.className = "tag-dropdown-item";
            
            // Create mini color indicator
            const miniTag = document.createElement("span");
            miniTag.className = `mini-tag ${color}`;
            miniTag.style.background = getComputedStyle(document.querySelector(`.color-option.${color}`)).background;
            
            div.appendChild(miniTag);
            div.appendChild(document.createTextNode(tag));
            
            div.onmousedown = (e) => {
                e.preventDefault();
                const currentVal = document.getElementById("tagInput").value;
                const currentParts = currentVal.split(',');
                if (currentParts.length > 1) {
                    addTag(currentParts.slice(0, -1).join(','));
                }
                addTag(tag, color);
                dropdown.style.display = "none";
            };
            dropdown.appendChild(div);
        });
        
        dropdown.style.display = "block";
    }
    
    function hideTagDropdown() {
        setTimeout(() => {
            document.getElementById("tagDropdown").style.display = "none";
            tagDropdownIndex = -1;
        }, 200);
    }
    
    function exportVocabulary() {
        if (entries.length === 0) {
            showImportStatus('No vocabulary entries to export!', 'error');
            return;
        }
        
        const dataStr = JSON.stringify(entries, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = "backup_" + new Date().toISOString().replace(/[:T]/g, "-").split(".")[0] + ".json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showImportStatus(`✓ Exported ${entries.length} entries successfully!`, 'success');
    }
    
    let pendingCollisions = [];
    let currentCollisionIndex = -1;
    let importStats = { added: 0, skipped: 0, overwritten: 0, both: 0 };

    function importVocabulary(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedData)) {
                    showImportStatus('Invalid file format. Expected JSON array.', 'error');
                    return;
                }
                
                pendingCollisions = [];
                importStats = { added: 0, skipped: 0, overwritten: 0, both: 0 };
                
                importedData.forEach(item => {
                    if (item.term && item.translation) {
                        // Normalize tags
                        let tags = [];
                        if (item.tags) {
                            tags = item.tags;
                        } else if (item.tag) {
                            tags = [{ text: item.tag, color: item.color || 'blue' }];
                        }

                        const newItem = {
                            term: item.term,
                            translation: item.translation,
                            tags: tags
                        };
                        
                        // Check for existing term (case-insensitive)
                        const existingIndex = entries.findIndex(e => e.term.toLowerCase() === newItem.term.toLowerCase());
                        
                        if (existingIndex !== -1) {
                            const existing = entries[existingIndex];
                            
                            // Check for exact identity
                            const sameTerm = existing.term === newItem.term;
                            const sameTrans = existing.translation === newItem.translation;
                            
                            // Check if new item tags are a subset of existing tags (or equal)
                            // If all tags in new item already exist in the current entry, we consider it "covered" and skip
                            const isTagSubset = (newItem.tags || []).every(nt => 
                                (existing.tags || []).some(et => et.text === nt.text)
                            );

                            if (sameTerm && sameTrans && isTagSubset) {
                                // Exact duplicate. Keep existing (skip).
                                importStats.skipped++;
                            } else {
                                // Collision
                                pendingCollisions.push({ newItem, existingIndex });
                            }
                        } else {
                            // New item
                            entries.push(newItem);
                            importStats.added++;
                        }
                    }
                });
                
                if (pendingCollisions.length > 0) {
                    currentCollisionIndex = 0;
                    showNextCollision();
                } else {
                    finishImport();
                }

            } catch (error) {
                console.error(error);
                showImportStatus('Error reading file. Please ensure it\'s a valid JSON file.', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }
    
    function showNextCollision() {
        const modal = document.getElementById('collisionModal');
        const collision = pendingCollisions[currentCollisionIndex];
        const existing = entries[collision.existingIndex];
        const newItem = collision.newItem;

        document.getElementById('collisionTerm').textContent = existing.term;
        document.getElementById('existingEntryDetails').innerHTML = formatEntryDetails(existing);
        document.getElementById('newEntryDetails').innerHTML = formatEntryDetails(newItem);
        
        document.getElementById('conflictCount').textContent = currentCollisionIndex + 1;
        document.getElementById('conflictTotal').textContent = pendingCollisions.length;

        // Dynamically update "Keep Both" button text based on context
        const keepBothBtn = modal.querySelector('button[onclick="resolveCollision(\'keepBoth\')"]');
        if (keepBothBtn) {
            if (existing.term === newItem.term && existing.translation === newItem.translation) {
                keepBothBtn.textContent = "Merge Tags";
            } else {
                keepBothBtn.textContent = "Keep Both";
            }
        }

        modal.style.display = 'flex';
    }

    function formatEntryDetails(entry) {
        const tagsHtml = entry.tags && entry.tags.length > 0 
            ? entry.tags.map(t => `<span class="tag ${t.color}" style="font-size:12px;padding:2px 6px;">${escapeHtml(t.text)}</span>`).join(' ')
            : '<span style="color:#999;font-style:italic">No tags</span>';
            
        return `
            <div class="comp-field">
                <div class="comp-label">Term</div>
                <div class="comp-value">${escapeHtml(entry.term)}</div>
            </div>
            <div class="comp-field">
                <div class="comp-label">Translation</div>
                <div class="comp-value">${escapeHtml(entry.translation)}</div>
            </div>
            <div class="comp-field">
                <div class="comp-label">Tags</div>
                <div class="comp-value">${tagsHtml}</div>
            </div>
        `;
    }

    function resolveCollision(action) {
        const collision = pendingCollisions[currentCollisionIndex];
        
        if (action === 'overwrite') {
            // Replace existing
            entries[collision.existingIndex] = collision.newItem;
            importStats.overwritten++;
        } else if (action === 'keepBoth') {
            const existing = entries[collision.existingIndex];
            const newItem = collision.newItem;
            
            // If term and translation match exactly, merge tags instead of creating a duplicate
            if (existing.term === newItem.term && existing.translation === newItem.translation) {
                let mergedCount = 0;
                newItem.tags.forEach(newTag => {
                    // Check if this tag text already exists in existing tags
                    if (!existing.tags.some(t => t.text === newTag.text)) {
                        existing.tags.push(newTag);
                        mergedCount++;
                    }
                });
                if (mergedCount > 0) {
                    importStats.overwritten++; // Count as update/overwrite since we modified existing
                } else {
                    importStats.skipped++; // No new tags were added
                }
            } else {
                // Different translation but same term (or whatever triggered collision), keep both
                entries.push(collision.newItem);
                importStats.both++;
            }
        } else {
            // Skip (keep existing)
            importStats.skipped++;
        }

        currentCollisionIndex++;
        if (currentCollisionIndex < pendingCollisions.length) {
            showNextCollision();
        } else {
            document.getElementById('collisionModal').style.display = 'none';
            finishImport();
        }
    }

    function finishImport() {
        entries.sort((a, b) => a.term.localeCompare(b.term));
        saveEntries();
        renderList();
        renderFilters();
        
        const parts = [];
        if (importStats.added > 0) parts.push(`${importStats.added} added`);
        if (importStats.overwritten > 0) parts.push(`${importStats.overwritten} updated`);
        if (importStats.both > 0) parts.push(`${importStats.both} kept as duplicate`);
        if (importStats.skipped > 0) parts.push(`${importStats.skipped} skipped`);
        
        const msg = parts.length > 0 ? `Import complete: ${parts.join(', ')}` : "Import complete: No changes made.";
        showImportStatus(msg, 'success');
    }
    
    function showImportStatus(message, type) {
        const statusDiv = document.getElementById('importStatus');
        statusDiv.textContent = message;
        statusDiv.className = `import-status ${type}`;
        
        setTimeout(() => {
            statusDiv.className = 'import-status';
        }, 5000);
    }

    function handleTermInput() {
        const searchTerm = document.getElementById("termInput").value.trim().toLowerCase();
        const dropdown = document.getElementById("dropdown");
        
        if (!searchTerm) {
            dropdown.style.display = "none";
            termMatches = [];
            termDropdownIndex = -1;
            return;
        }

        const matches = entries.filter(e => 
            e.term.toLowerCase().includes(searchTerm) || 
            e.translation.toLowerCase().includes(searchTerm)
        );

        dropdown.innerHTML = "";

        if (matches.length === 0) {
            dropdown.style.display = "none";
            termMatches = [];
            termDropdownIndex = -1;
            return;
        }

        termMatches = matches;
        termDropdownIndex = -1;
        matches.forEach(match => {
            const div = document.createElement("div");
            div.className = "dropdown-item";
            div.innerHTML = `<span class="match-term">${escapeHtml(match.term)}</span><span class="match-translation">— ${escapeHtml(match.translation)}</span>`;
            div.onmousedown = (e) => {
                e.preventDefault();
                const itemIndex = entries.findIndex(entry => 
                    entry.term === match.term && entry.translation === match.translation
                );
                if (itemIndex !== -1) {
                    editItem(itemIndex);
                    document.getElementById("translationInput").focus();
                }
                dropdown.style.display = "none";
            };
            dropdown.appendChild(div);
        });

        dropdown.style.display = "block";
    }

    function hideDropdown() {
        setTimeout(() => {
            document.getElementById("dropdown").style.display = "none";
            termMatches = [];
            termDropdownIndex = -1;
        }, 200);
    }

    function handleTranslationInput() {
        const searchTerm = document.getElementById("translationInput").value.trim().toLowerCase();
        const dropdown = document.getElementById("translationDropdown");
        if (!searchTerm) {
            dropdown.style.display = "none";
            translationMatches = [];
            translationDropdownIndex = -1;
            return;
        }
        const matches = entries.filter(e =>
            e.translation.toLowerCase().includes(searchTerm) ||
            e.term.toLowerCase().includes(searchTerm)
        );
        dropdown.innerHTML = "";
        if (matches.length === 0) {
            dropdown.style.display = "none";
            translationMatches = [];
            translationDropdownIndex = -1;
            return;
        }
        translationMatches = matches;
        translationDropdownIndex = -1;
        matches.forEach(match => {
            const div = document.createElement("div");
            div.className = "dropdown-item";
            div.innerHTML = `<span class="match-term">${escapeHtml(match.translation)}</span><span class="match-translation">— ${escapeHtml(match.term)}</span>`;
            div.onmousedown = (e) => {
                e.preventDefault();
                const itemIndex = entries.findIndex(entry =>
                    entry.term === match.term && entry.translation === match.translation
                );
                if (itemIndex !== -1) {
                    editItem(itemIndex);
                    document.getElementById("tagInput").focus();
                }
                dropdown.style.display = "none";
            };
            dropdown.appendChild(div);
        });
        dropdown.style.display = "block";
    }
    
    function hideTranslationDropdown() {
        setTimeout(() => {
            document.getElementById("translationDropdown").style.display = "none";
            translationMatches = [];
            translationDropdownIndex = -1;
        }, 200);
    }
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function handleKeyPress(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            const dropdown = document.getElementById("dropdown");
            const translationDropdown = document.getElementById("translationDropdown");
            const tagDropdown = document.getElementById("tagDropdown");
            if (dropdown.style.display === "block" || translationDropdown.style.display === "block" || tagDropdown.style.display === "block") {
                return;
            }
            
            if (document.activeElement === document.getElementById("tagInput")) {
                 const val = document.getElementById("tagInput").value.trim();
                 if (val) {
                     addTag();
                     return;
                 }
            }
            
            addItem();
        }
    }

    function highlightItem(index) {
        // Remove previous highlights
        document.querySelectorAll('.item').forEach(item => {
            item.classList.remove('highlight');
        });
        
        // Highlight the selected item
        const itemElement = document.getElementById(`item-${index}`);
        if (itemElement) {
            itemElement.classList.add('highlight');
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
                itemElement.classList.remove('highlight');
            }, 3000);
        }
    }

    // Set up term input listeners
    document.getElementById("termInput").addEventListener("input", handleTermInput);
    document.getElementById("termInput").addEventListener("focus", handleTermInput);
    document.getElementById("termInput").addEventListener("blur", hideDropdown);
    document.getElementById("termInput").addEventListener("keydown", function(e) {
        const dropdown = document.getElementById("dropdown");
        const items = Array.from(dropdown.querySelectorAll(".dropdown-item"));
        if (e.key === "ArrowDown") {
            if (dropdown.style.display === "block" && termMatches.length > 0) {
                e.preventDefault();
                termDropdownIndex = Math.min(termDropdownIndex + 1, termMatches.length - 1);
                items.forEach(i => i.classList.remove("active"));
                if (termDropdownIndex >= 0) items[termDropdownIndex].classList.add("active");
            }
        } else if (e.key === "ArrowUp") {
            if (dropdown.style.display === "block" && termMatches.length > 0) {
                e.preventDefault();
                termDropdownIndex = Math.max(termDropdownIndex - 1, -1);
                items.forEach(i => i.classList.remove("active"));
                if (termDropdownIndex >= 0) items[termDropdownIndex].classList.add("active");
            }
        } else if (e.key === "Enter") {
            if (dropdown.style.display === "block" && termMatches.length > 0 && termDropdownIndex >= 0) {
                e.preventDefault();
                const match = termMatches[termDropdownIndex];
                const itemIndex = entries.findIndex(entry => 
                    entry.term === match.term && entry.translation === match.translation
                );
                if (itemIndex !== -1) {
                    editItem(itemIndex);
                    document.getElementById("translationInput").focus();
                }
                dropdown.style.display = "none";
            }
        } else if (e.key === "Tab") {
            e.preventDefault();
            dropdown.style.display = "none";
            termMatches = [];
            termDropdownIndex = -1;
            document.getElementById("translationInput").focus();
        }
    });
    document.getElementById("translationInput").addEventListener("input", handleTranslationInput);
    document.getElementById("translationInput").addEventListener("focus", handleTranslationInput);
    document.getElementById("translationInput").addEventListener("blur", hideTranslationDropdown);
    document.getElementById("translationInput").addEventListener("keydown", function(e) {
        const dropdown = document.getElementById("translationDropdown");
        const items = Array.from(dropdown.querySelectorAll(".dropdown-item"));
        if (e.key === "ArrowDown") {
            if (dropdown.style.display === "block" && translationMatches.length > 0) {
                e.preventDefault();
                translationDropdownIndex = Math.min(translationDropdownIndex + 1, translationMatches.length - 1);
                items.forEach(i => i.classList.remove("active"));
                if (translationDropdownIndex >= 0) items[translationDropdownIndex].classList.add("active");
            }
        } else if (e.key === "ArrowUp") {
            if (dropdown.style.display === "block" && translationMatches.length > 0) {
                e.preventDefault();
                translationDropdownIndex = Math.max(translationDropdownIndex - 1, -1);
                items.forEach(i => i.classList.remove("active"));
                if (translationDropdownIndex >= 0) items[translationDropdownIndex].classList.add("active");
            }
        } else if (e.key === "Enter") {
            if (dropdown.style.display === "block" && translationMatches.length > 0 && translationDropdownIndex >= 0) {
                e.preventDefault();
                const match = translationMatches[translationDropdownIndex];
                const itemIndex = entries.findIndex(entry =>
                    entry.term === match.term && entry.translation === match.translation
                );
                if (itemIndex !== -1) {
                    editItem(itemIndex);
                    document.getElementById("tagInput").focus();
                }
                dropdown.style.display = "none";
            }
        } else if (e.key === "Tab") {
            e.preventDefault();
            dropdown.style.display = "none";
            translationMatches = [];
            translationDropdownIndex = -1;
            document.getElementById("tagInput").focus();
        }
    });
    document.getElementById("tagInput").addEventListener("keydown", function(e) {
        const dropdown = document.getElementById("tagDropdown");
        const items = Array.from(dropdown.querySelectorAll(".tag-dropdown-item"));
        if (e.key === "ArrowDown") {
            if (dropdown.style.display === "block" && items.length > 0) {
                e.preventDefault();
                tagDropdownIndex = Math.min(tagDropdownIndex + 1, items.length - 1);
                items.forEach(i => i.classList.remove("active"));
                if (tagDropdownIndex >= 0) items[tagDropdownIndex].classList.add("active");
            }
        } else if (e.key === "ArrowUp") {
            if (dropdown.style.display === "block" && items.length > 0) {
                e.preventDefault();
                tagDropdownIndex = Math.max(tagDropdownIndex - 1, -1);
                items.forEach(i => i.classList.remove("active"));
                if (tagDropdownIndex >= 0) items[tagDropdownIndex].classList.add("active");
            }
        } else if (e.key === "Enter") {
            if (dropdown.style.display === "block" && items.length > 0 && tagDropdownIndex >= 0) {
                e.preventDefault();
                const item = items[tagDropdownIndex];
                const tag = item.textContent.trim();
                const miniTag = item.querySelector(".mini-tag");
                // Extract color from class list (assumes "mini-tag {color}")
                let color = 'blue';
                if (miniTag.classList.length > 1) {
                    color = miniTag.classList[1];
                }
                
                const currentVal = document.getElementById("tagInput").value;
                const currentParts = currentVal.split(',');
                if (currentParts.length > 1) {
                    addTag(currentParts.slice(0, -1).join(','));
                }
                
                addTag(tag, color);
                dropdown.style.display = "none";
                document.querySelector('button[onclick="addItem()"]').focus();
            }
        } else if (e.key === "Tab") {
            e.preventDefault();
            dropdown.style.display = "none";
            tagMatches = [];
            tagDropdownIndex = -1;
            document.querySelector('button[onclick="addItem()"]').focus();
        }
    });

    // Load entries on start
    loadEntries();
    loadTheme();
    renderFilters();
    
    function toggleTheme() {
        const body = document.body;
        const themeToggle = document.querySelector('.theme-toggle');
        
        body.classList.toggle('night-mode');
        
        if (body.classList.contains('night-mode')) {
            themeToggle.textContent = '☀️';
            localStorage.setItem('theme', 'night');
        } else {
            themeToggle.textContent = '🌙';
            localStorage.setItem('theme', 'day');
        }
    }
    
    function loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const body = document.body;
        const themeToggle = document.querySelector('.theme-toggle');
        
        if (savedTheme === 'night') {
            body.classList.add('night-mode');
            themeToggle.textContent = '☀️';
        }
    }
