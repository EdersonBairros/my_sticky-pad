/**
 * Componente de seletor de cores para as notas.
 * @module ui/color-picker
 */

/**
 * Cria o dropdown de seletor de cores para uma nota.
 * @param {string} noteId - ID da nota
 * @param {string} currentColor - Cor atual em hex
 * @returns {HTMLElement} Elemento dropdown
 */
function createColorPicker(noteId, currentColor) {
    const div = document.createElement('div');
    div.className = 'color-picker-dropdown';
    div.dataset.colorPicker = noteId;

    let presetsHtml = '<div class="color-picker-label">Cores</div><div class="color-presets">';
    PRESET_COLORS.forEach(c => {
        const isActive = c.hex === currentColor;
        presetsHtml += `<button class="color-preset ${isActive ? 'active' : ''}" data-color="${c.hex}" data-action="set-color" style="background-color: ${c.hex}; border-color: ${isActive ? '#333' : '#ddd'}" title="${c.name}"></button>`;
    });
    presetsHtml += `<button class="color-preset-add" data-action="toggle-custom" title="Cor personalizada">+</button>`;
    presetsHtml += '</div>';

    const gradientId = 'grad-' + noteId;
    const currentHex = currentColor || '#FFF3CD';
    const customHtml = `
        <div class="color-custom-section" style="display: none;">
            <div class="color-picker-label">Personalizado</div>
            <div class="color-gradient-picker">
                <canvas class="color-spectrum-canvas" id="${gradientId}" width="396" height="40"></canvas>
            </div>
            <div class="color-preview-bar">
                <div class="color-preview-swatch" id="swatch-${noteId}" style="background-color: ${currentHex}"></div>
                <div class="color-hex-input-group">
                    <input type="text" class="color-hex-input" id="hex-${noteId}" placeholder="#FF5733" maxlength="7" value="${currentHex}">
                    <button class="color-hex-apply" data-action="apply-hex">OK</button>
                </div>
            </div>
        </div>
    `;

    div.innerHTML = presetsHtml + customHtml;
    return div;
}

/** Fecha todos os color pickers abertos. */
function closeColorPickers() {
    document.querySelectorAll('.color-picker-dropdown.open').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.color-btn.active').forEach(b => b.classList.remove('active'));
}

/**
 * Aplica uma cor a uma nota e atualiza a UI.
 * @param {string} noteId
 * @param {string|null} color
 */
function applyColor(noteId, color) {
    const note = getNoteById(noteId);
    if (!note) return;
    note.color = color;
    storagePersist();

    const noteItem = document.querySelector(`.note-item[data-id="${noteId}"]`);
    if (!noteItem) return;

    if (color) {
        noteItem.style.backgroundColor = color;
        noteItem.style.borderLeftColor = darkenColor(color, 30);
    } else {
        noteItem.style.backgroundColor = '';
        noteItem.style.borderLeftColor = '';
    }

    const dropdown = noteItem.querySelector('.color-picker-dropdown');
    if (dropdown) {
        dropdown.querySelectorAll('.color-preset').forEach(p => {
            const isActive = p.dataset.color === color;
            p.classList.toggle('active', isActive);
            p.style.borderColor = isActive ? '#333' : '#ddd';
        });
    }
    closeColorPickers();
}

/**
 * Inicializa o canvas de gradiente para seleção de cor personalizada.
 * @param {HTMLCanvasElement} canvas
 */
function initGradientCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const gradH = ctx.createLinearGradient(0, 0, w, 0);
    gradH.addColorStop(0.00, '#FF0000');
    gradH.addColorStop(0.17, '#FFFF00');
    gradH.addColorStop(0.33, '#00FF00');
    gradH.addColorStop(0.50, '#00FFFF');
    gradH.addColorStop(0.67, '#0000FF');
    gradH.addColorStop(0.83, '#FF00FF');
    gradH.addColorStop(1.00, '#FF0000');
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, w, h);

    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0.0, 'rgba(255,255,255,0.8)');
    gradV.addColorStop(0.3, 'rgba(255,255,255,0)');
    gradV.addColorStop(0.7, 'rgba(0,0,0,0)');
    gradV.addColorStop(1.0, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);

    canvas.onclick = function (e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.round((e.clientX - rect.left) * scaleX);
        const y = Math.round((e.clientY - rect.top) * scaleY);

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v =>
            v.toString(16).padStart(2, '0')
        ).join('').toUpperCase();

        const noteItem = canvas.closest('.note-item');
        if (noteItem) {
            const swatch = document.getElementById('swatch-' + noteItem.dataset.id);
            const hexInput = document.getElementById('hex-' + noteItem.dataset.id);
            if (swatch) swatch.style.backgroundColor = hex;
            if (hexInput) hexInput.value = hex;
        }
    };
}