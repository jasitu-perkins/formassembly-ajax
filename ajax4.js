// Validation module
const wFormsValidation = {
    handleErrors(validationInstance, form) {
        requestAnimationFrame(() => {
            Object.entries(validationInstance.elementsInError)
                .filter(([_, field]) => field?.id && field?.rule)
                .forEach(([_, field]) => {
                    const errDiv = form.querySelector(`#${field.id}-E`);
                    if (errDiv) {
                        const label = form.querySelector(`#${field.id}-L`);
                        const labelText = label?.innerText || '';
                        errDiv.innerText = (wFORMS.behaviors.validation.messages[field.rule] || 
                            'This field is invalid')
                            .replace('This field', labelText);
                        errDiv.classList.add('active');
                    }
                });
        });
    }
};

// AJAX Processing module
const wFormsAjaxProcessor = {
    async processForm(submitBtn, formData) {
        const originalText = submitBtn.value;
        submitBtn.value = 'Please wait...';
        submitBtn.disabled = true;
        try {
            const response = await fetch('https://perkinsschool.tfaforms.net/api_v2/workflow/processor', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error();
            const responseData = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(responseData, 'text/html');
            return Array.from(doc.body.childNodes);
        } catch (error) {
            throw new Error('Failed to process form submission');
        } finally {
            submitBtn.value = originalText;
            submitBtn.disabled = false;
        }
    }
};

// reCAPTCHA Setup module
const wFormsRecaptcha = {
    setupLabel(textarea) {
        if (!textarea) return;
        
        const label = document.createElement('label');
        label.htmlFor = 'g-recaptcha-response';
        label.textContent = 'reCAPTCHA response';
        textarea.parentNode.insertBefore(label, textarea);
    },

    init(container) {
        let attempts = 0;
        const MAX = 30;

        const checkAndInitialize = () => {
            if (attempts++ >= MAX) return;
            
            const textarea = container.querySelector('textarea#g-recaptcha-response');
            
            if (!window.grecaptcha || !textarea) {
                requestAnimationFrame(checkAndInitialize);
                return;
            }
            
            wFormsRecaptcha.setupLabel(textarea);
        };

        checkAndInitialize();
    }
};

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.wFormContainer');
    
    containers.forEach(container => {
        const form = container.querySelector('.wForm form');
        if (!form) return;

        // Initialize reCAPTCHA for this container
        wFormsRecaptcha.init(container);

        // Store whether this form has the noajax class
        const isNoAjax = container.classList.contains('noajax');
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        const validationInstance = wFORMS.behaviors.validation.applyTo(form);

        container.addEventListener('submit', async (e) => {
            // Only prevent default if not noajax
            if (!isNoAjax) {
                e.preventDefault();
            }

            // Store original alert function
            const originalAlert = window.alert;
            window.alert = () => {};

            try {
                if (!validationInstance.run(e, form)) {
                    wFormsValidation.handleErrors(validationInstance, form);
                    return;
                }

                // Only process AJAX if not noajax and submit button exists
                if (!isNoAjax && submitBtn) {
                    const elements = await wFormsAjaxProcessor.processForm(submitBtn, new FormData(form));
                    const responseContainer = document.createElement('div');
                    elements.forEach(element => {
                        responseContainer.appendChild(element.cloneNode(true));
                    });
                    container.parentNode.replaceChild(responseContainer, container);
                }
            } catch (error) {
                alert('There was an error processing your submission. Please try again.');
            } finally {
                window.alert = originalAlert;
            }
        });
    });
});