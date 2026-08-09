/**
 * Modal "Apoie o projeto" — exibe os dados de doação (Pix + transferência).
 * Segue o padrão de modal do projeto (overlay + caixa, fecha no Esc / clique
 * fora, abre com a classe `.open`) — ver `showConfirm` em notifications.js.
 * @module ui/support
 */

/**
 * Dados de apoio. ÚNICO ponto para editar chave/banco.
 * `pixKey` é o que aparece no texto E o que o botão "Copiar" copia.
 * (Para não expor o CPF publicamente, troque por uma chave Pix aleatória aqui.)
 */
const SUPPORT_INFO = {
    pixKey: 'f44d1332-52cf-4704-85ce-4671101b77ed', // chave aleatória (não expõe o CPF)
    holder: 'Ederson Paulo de Bairros',
    cpf: '086.371.159-69',
    bankName: 'Banco Pan S. A.',
    agency: '0001',
    account: '032401076-0'
};

const SUPPORT_MESSAGE =
    'Este projeto é totalmente gratuito e mantido com amor. Se você gosta da ' +
    'extensão e quer ajudar a mantê-la viva e em constante melhoria, qualquer ' +
    'contribuição é muito bem-vinda e ajuda no desenvolvimento.';

/**
 * Abre o modal "Apoie o projeto". Idempotente: se já estiver aberto, não duplica.
 */
function openSupportModal() {
    if (document.querySelector('.support-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'support-overlay';
    overlay.innerHTML = `
        <div class="support-box" role="dialog" aria-modal="true" aria-label="Apoie o projeto">
            <button class="support-close" type="button" aria-label="Fechar">✕</button>
            <h2 class="support-title">Apoie o projeto 💜</h2>
            <p class="support-message"></p>
            <div class="support-qr">
                <img class="support-qr-img" src="icons/pix-qrcode.svg" alt="QR Code do Pix">
                <span class="support-qr-caption">Pix QR-Code</span>
            </div>
            <div class="support-key">
                <span class="support-key-text"><strong>PIX KEY:</strong> <span class="support-key-value"></span></span>
                <button class="support-copy" type="button">Copiar</button>
            </div>
            <div class="support-bank"></div>
        </div>
    `;

    // Textos dinâmicos via textContent (boa prática do projeto: nunca injetar HTML).
    overlay.querySelector('.support-message').textContent = SUPPORT_MESSAGE;
    overlay.querySelector('.support-key-value').textContent = SUPPORT_INFO.pixKey;

    // Bloco de transferência bancária (o CSS deixa tudo em negrito).
    const bank = overlay.querySelector('.support-bank');
    const title = document.createElement('strong');
    title.className = 'support-bank-title';
    title.textContent = 'Transferência bancária';
    bank.appendChild(title);
    [
        ['Favorecido', SUPPORT_INFO.holder],
        ['CPF', SUPPORT_INFO.cpf],
        ['Banco', SUPPORT_INFO.bankName],
        ['Agência', SUPPORT_INFO.agency],
        ['Conta', SUPPORT_INFO.account]
    ].forEach(([label, value]) => {
        const line = document.createElement('div');
        line.className = 'support-bank-line';
        line.textContent = `${label}: ${value}`;
        bank.appendChild(line);
    });

    document.body.appendChild(overlay);

    const close = () => {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
    };
    const onKey = e => { if (e.key === 'Escape') close(); };

    overlay.querySelector('.support-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    overlay.querySelector('.support-copy').addEventListener('click', function () {
        _copyPixKey(this);
    });

    requestAnimationFrame(() => overlay.classList.add('open'));
}

/**
 * Copia a chave Pix para a área de transferência, com feedback (toast + botão).
 * @param {HTMLElement} btn - Botão "Copiar" (para feedback visual)
 */
function _copyPixKey(btn) {
    const done = () => {
        showToast('Chave Pix copiada!', 'success');
        if (btn) {
            const original = btn.textContent;
            btn.textContent = 'Copiado!';
            setTimeout(() => { btn.textContent = original; }, 1500);
        }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(SUPPORT_INFO.pixKey).then(done).catch(() => _fallbackCopy(done));
    } else {
        _fallbackCopy(done);
    }
}

/** Fallback de cópia para contextos sem `navigator.clipboard`. */
function _fallbackCopy(done) {
    try {
        const ta = document.createElement('textarea');
        ta.value = SUPPORT_INFO.pixKey;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        done();
    } catch (e) {
        showToast('Não foi possível copiar a chave.', 'error');
    }
}
