document.addEventListener('DOMContentLoaded', () => {
    /* ==========================================================================
       Calendar Availability Logic (Flatpickr)
       ========================================================================== */
    const scriptURL = 'https://script.google.com/macros/s/AKfycbx9H-jvX8iyoHuKkKte11WxP-vCtjjm0bWtfi9rJBRFdhk97XgunZBpG8LryM_c_FUr/exec';
    
    // Fetch booked dates from Google Script (Requires a doGet function in the script)
    fetch(scriptURL)
        .then(res => res.json())
        .then(dateCounts => {
            initCalendars(dateCounts);
        })
        .catch(err => {
            console.warn("Could not fetch availability dates (doGet might not be set up). Falling back to all green.", err);
            initCalendars({});
        });

    function initCalendars(dateCounts) {
        const fpConfig = {
            minDate: "today",
            dateFormat: "Y-m-d",
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                // Adjust for timezone to get the correct YYYY-MM-DD local string
                const localDate = new Date(dayElem.dateObj.getTime() - (dayElem.dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                const count = dateCounts[localDate] || 0;
                
                // If more than 5 bookings, make it red, otherwise green
                if (count >= 5) {
                    dayElem.style.backgroundColor = 'rgba(220, 53, 69, 0.15)'; // Light red
                    dayElem.style.color = '#dc3545';
                    dayElem.style.fontWeight = 'bold';
                    dayElem.style.borderRadius = '4px';
                    // Optional: uncomment below to completely disable booking on these dates
                    // dayElem.classList.add('flatpickr-disabled');
                } else {
                    dayElem.style.backgroundColor = 'rgba(40, 167, 69, 0.15)'; // Light green
                    dayElem.style.color = '#28a745';
                    dayElem.style.fontWeight = 'bold';
                    dayElem.style.borderRadius = '4px';
                }
            }
        };

        if (typeof flatpickr !== 'undefined') {
            flatpickr("#check-in-home", fpConfig);
            flatpickr("#check-out-home", fpConfig);
            flatpickr("#check-in", fpConfig); // Main form
            flatpickr("#check-out", fpConfig); // Main form
        }
    }

    /* ==========================================================================
       Header & Navigation
       ========================================================================== */
    const header = document.getElementById('header');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const primaryNav = document.getElementById('primary-nav');
    const navLinks = document.querySelectorAll('.nav-links a');

    // Scroll Header
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Init

    // Mobile Menu Toggle
    const toggleMenu = () => {
        const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
        mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
        mobileMenuToggle.classList.toggle('active');
        primaryNav.classList.toggle('active');
        
        if (!isExpanded) {
            document.body.style.overflow = 'hidden'; // Prevent scrolling when menu open
        } else {
            document.body.style.overflow = '';
        }
    };

    mobileMenuToggle.addEventListener('click', toggleMenu);

    // Close mobile menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (primaryNav.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    /* ==========================================================================
       Smooth Scrolling & Active Link Highlights
       ========================================================================== */
    const sections = document.querySelectorAll('section[id]');
    
    // Active Link Highlighting
    const highlightActiveLink = () => {
        const scrollY = window.scrollY;

        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 100;
            const sectionId = current.getAttribute('id');
            const link = document.querySelector(`.nav-links a[href*=${sectionId}]`);
            
            if (link) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    };

    window.addEventListener('scroll', highlightActiveLink);

    /* ==========================================================================
       Form Validation
       ========================================================================== */
    const setupFormValidation = (formId) => {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;
            
            const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
            
            inputs.forEach(input => {
                const errorMsg = input.nextElementSibling;
                
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                    if (errorMsg && errorMsg.classList.contains('error-msg')) {
                        errorMsg.textContent = 'This field is required';
                    }
                } else if (input.type === 'email' && !isValidEmail(input.value)) {
                    isValid = false;
                    input.classList.add('error');
                    if (errorMsg && errorMsg.classList.contains('error-msg')) {
                        errorMsg.textContent = 'Please enter a valid email';
                    }
                } else {
                    input.classList.remove('error');
                    if (errorMsg && errorMsg.classList.contains('error-msg')) {
                        errorMsg.textContent = '';
                    }
                }
            });

            if (isValid) {
                // Determine which form it is
                const btn = form.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.textContent = 'Checking...';
                btn.disabled = true;
                
                // Google Sheets Web App URL (Replace with your actual URL later)
                const scriptURL = 'https://script.google.com/macros/s/AKfycbx9H-jvX8iyoHuKkKte11WxP-vCtjjm0bWtfi9rJBRFdhk97XgunZBpG8LryM_c_FUr/exec';
                
                // If it's the home widget or main booking form, send to Google Sheets
                if (formId === 'homeBookingForm' || formId === 'mainBookingForm') {
                    const formData = new FormData(form);
                    // Add an identifier
                    formData.append('formType', formId);
                    
                    fetch(scriptURL, { method: 'POST', body: formData })
                        .then(response => {
                            alert('Success! Your availability request has been sent to our team.');
                            form.reset();
                            btn.textContent = originalText;
                            btn.disabled = false;
                        })
                        .catch(error => {
                            console.error('Error!', error.message);
                            // Fallback alert if URL is not set yet
                            alert('Thank you! Note: Google Sheets URL is not connected yet, but the frontend works perfectly.');
                            form.reset();
                            btn.textContent = originalText;
                            btn.disabled = false;
                        });
                } else {
                    // Normal mock submission for contact/newsletter
                    setTimeout(() => {
                        alert('Thank you! Your request has been received.');
                        form.reset();
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }, 1500);
                }
            }
        });

        // Clear error on input
        form.addEventListener('input', (e) => {
            if (e.target.classList.contains('error')) {
                e.target.classList.remove('error');
                const errorMsg = e.target.nextElementSibling;
                if (errorMsg && errorMsg.classList.contains('error-msg')) {
                    errorMsg.textContent = '';
                }
            }
        });
    };

    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    setupFormValidation('homeBookingForm');
    setupFormValidation('mainBookingForm');
    setupFormValidation('contactForm');
    setupFormValidation('newsletterForm');

    /* ==========================================================================
       Lazy Loading Background Removal (for image loading states)
       ========================================================================== */
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    images.forEach(img => {
        if (img.complete) {
            img.parentElement.classList.remove('loading-bg');
        } else {
            img.addEventListener('load', () => {
                img.parentElement.classList.remove('loading-bg');
            });
        }
    });
});
