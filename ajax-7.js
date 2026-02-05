const FormValidator = {
    customize(err, form) {
        if (err.dataset.done) return;
        
        const text = err.textContent.trim();
        if (!text) return;
        
        if (text.includes('This field')) {
            const label = form.querySelector(`#${err.id.slice(0, -2)}-L`)?.textContent?.trim();
            if (label) err.textContent = text.replace(/This field/gi, label);
        }
        
        err.setAttribute('role', 'alert');
        err.dataset.done = '1';
        err.style.visibility = 'visible';
    },
    
    label(textarea) {
        if (textarea.labels.length) return;
        const lbl = document.createElement('label');
        lbl.htmlFor = textarea.id || (textarea.id = 'g-recaptcha-response');
        lbl.textContent = 'reCAPTCHA verification';
        lbl.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
        textarea.before(lbl);
    }
};

// Hide all errors by default
const style = document.createElement('style');
style.textContent = '.errMsg[id$="-E"] { visibility: hidden; }';
document.head.appendChild(style);

// Alert suppression
(function() {
    const alert = window.alert;
    let t;
    window.alert = msg => {
        if (!msg?.includes('form is not complete') && !msg?.includes('problems with your submission')) {
            return alert(msg);
        }
        if (!t) {
            alert(msg);
            t = setTimeout(() => t = null, 500);
        }
    };
})();

function init(form) {
    const validator = wFORMS.getBehaviorInstance(form, 'validation') || 
                     wFORMS.behaviors.validation.applyTo(form);
    
    let pending;
    new MutationObserver(mutations => {
        const errors = new Set();
        
        mutations.forEach(m => {
            const target = m.target.nodeType === 3 ? m.target.parentElement : m.target;
            
            if (target?.id?.endsWith('-E') && target.textContent.trim()) {
                errors.add(target);
            }
            
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                
                // Label any reCAPTCHA that appears
                const captchas = node.name === 'g-recaptcha-response' ? [node] : 
                                node.querySelectorAll?.('textarea[name="g-recaptcha-response"]') || [];
                captchas.forEach(FormValidator.label);
                
                // Collect errors
                node.querySelectorAll?.('.errMsg[id$="-E"]').forEach(e => {
                    if (e.textContent.trim()) errors.add(e);
                });
            });
        });
        
        if (errors.size) {
            clearTimeout(pending);
            pending = setTimeout(() => {
                errors.forEach(e => FormValidator.customize(e, form));
            }, 10);
        }
    }).observe(form, { childList: true, characterData: true, subtree: true });
    
    // Label any existing reCAPTCHAs
    form.querySelectorAll('textarea[name="g-recaptcha-response"]').forEach(FormValidator.label);
    
    form.addEventListener('submit', async function(e) {
        const container = form.closest('.wFormContainer');
        if (container?.classList.contains('noajax')) return;
        
        e.preventDefault();
        
        if (!validator.run(e, form)) {
            Object.values(validator.elementsInError).forEach(f => {
                if (!f?.id) return;
                const err = form.querySelector(`#${f.id}-E`);
                const el = form.querySelector(`#${f.id}`);
                if (!err || !el) return;
                
                const lbl = form.querySelector(`#${f.id}-L`)?.textContent?.trim();
                err.textContent = (wFORMS.behaviors.validation.messages[f.rule] || 'Invalid')
                    .replace('This field', lbl || 'This field');
                err.setAttribute('role', 'alert');
                err.style.display = 'block';
                err.style.visibility = 'visible';
                err.dataset.done = '1';
                
                el.setAttribute('aria-invalid', 'true');
                el.setAttribute('aria-describedby', `${f.id}-E`);
            });
            
            setTimeout(() => form.querySelector('[aria-invalid]')?.focus(), 100);
            return;
        }
        
        const btn = form.querySelector('[type="submit"]');
        const txt = btn.value;
        btn.value = 'Submitting...';
        btn.disabled = true;
        
        try {
            const res = await fetch(form.action, { method: 'POST', body: new FormData(form) });
            if (!res.ok) throw 0;
            
            const html = await res.text();
            const result = new DOMParser().parseFromString(html, 'text/html')
                .querySelector('#wFormThankYouPage, .wFormContainer');
            
            if (result) {
                (container || form).replaceWith(result);
                const ty = result.querySelector('#wFormThankYouPage');
                if (ty) {
                    ty.tabIndex = -1;
                    ty.focus();
                }
            }
        } catch {
            alert('Error submitting form. Please try again.');
        } finally {
            btn.value = txt;
            btn.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form[id]').forEach(init);
});