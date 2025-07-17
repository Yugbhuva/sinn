// Flash message auto-hide
document.addEventListener('DOMContentLoaded', function() {
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    });
});

// URL form submission
document.getElementById('urlForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const submitButton = this.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    // Show loading state
    submitButton.textContent = 'Shortening...';
    submitButton.disabled = true;
    
    try {
        const response = await fetch('/create', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success result
            document.getElementById('shortUrl').value = data.short_url;
            document.getElementById('result').style.display = 'block';
            
            // Clear the form
            this.reset();
            
            // Show success message
            showNotification('Short URL created successfully!', 'success');
            
            // Reload page after 2 seconds to show new URL in the list
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            // Show error message
            showNotification(data.error || 'Error creating short URL', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
});

// Copy to clipboard function
function copyToClipboard(text) {
    const textToCopy = text || document.getElementById('shortUrl').value;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification('URL copied to clipboard!', 'success');
        }).catch(err => {
            fallbackCopyTextToClipboard(textToCopy);
        });
    } else {
        fallbackCopyTextToClipboard(textToCopy);
    }
}

// Fallback copy function for older browsers
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showNotification('URL copied to clipboard!', 'success');
    } catch (err) {
        showNotification('Failed to copy URL', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Show notification function
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
        ${type === 'success' ? 'background: linear-gradient(135deg, #4CAF50, #45a049);' : ''}
        ${type === 'error' ? 'background: linear-gradient(135deg, #f44336, #da190b);' : ''}
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// URL validation helper
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Add smooth scrolling to all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Add loading animation for delete buttons
document.querySelectorAll('a.btn-danger').forEach(button => {
    button.addEventListener('click', function(e) {
        if (confirm('Are you sure you want to delete this URL?')) {
            this.textContent = 'Deleting...';
            this.style.opacity = '0.7';
            this.style.pointerEvents = 'none';
        } else {
            e.preventDefault();
        }
    });
});

// Add hover effect for URL cards
document.querySelectorAll('.url-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    });
});

// Add enter key support for URL input
document.getElementById('originalUrl')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('urlForm').dispatchEvent(new Event('submit'));
    }
});

// Auto-focus on URL input when page loads
window.addEventListener('load', function() {
    const urlInput = document.getElementById('originalUrl');
    if (urlInput) {
        urlInput.focus();
    }
});

// Add double-click to copy for short URLs
document.querySelectorAll('.short-url a').forEach(link => {
    link.addEventListener('dblclick', function(e) {
        e.preventDefault();
        copyToClipboard(this.href);
    });
    
    // Add tooltip
    link.title = 'Double-click to copy';
});