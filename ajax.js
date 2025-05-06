document.addEventListener('DOMContentLoaded', function() {
    // Find all FormAssembly forms on the page
    const forms = document.querySelectorAll('.wForm');
    
    // Handle each form individually
    forms.forEach(form => {
        const container = form.closest('.wFormContainer');
        const formId = form.id;
        
        // Find the actual form element within the wrapper
        const formElement = form.querySelector('form');
        
        // Prevent default form submission
        formElement.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Check if the form is valid using wForms validation
            const validationInstance = wFORMS.behaviors.validation.applyTo(formElement);
            if (!validationInstance.run(e, formElement)) {
                return; // Stop if validation fails
            }
            
            // Log form submission attempt
            console.log(`📝 Form submission started (Form ID: ${formId})`);
            
            // Show loading state
            const submitButton = formElement.querySelector('[type="submit"]');
            const originalText = submitButton.value;
            submitButton.value = 'Processing...';
            submitButton.disabled = true;
            
            // Collect form data
            const formData = new FormData(formElement);
            
            // Submit the form
            fetch('https://perkinsschool.tfaforms.net/api_v2/workflow/processor', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                
                if (!response.ok) {
                    throw new Error('Form submission failed');
                }
                
                return response.text();
            })
            .then(html => {
                
                // Replace the form with the thank you page
                container.innerHTML = html;
                
                // Reset button state
                submitButton.value = originalText;
                submitButton.disabled = false;
                
            })
            .catch(error => {
                
                alert('There was an error processing your submission. Please try again.');
                
                // Reset button state on error
                submitButton.value = originalText;
                submitButton.disabled = false;
            });
        });
    });
});
