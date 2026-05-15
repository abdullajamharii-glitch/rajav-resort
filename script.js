document.addEventListener('DOMContentLoaded', () => {
    /* ==========================================================================
       Calendar Availability Logic (Flatpickr)
       ========================================================================== */
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyWNr2c4swsLv5hG9HbhFK0krRNdqWO1n5S5W4QD-6oaxX158Qo4a9O7UUdKghnwqXx/exec';
    
    // Room Capacities (Made global for book-now.js)
    window.roomCapacities = {
        "Premium Jacuzzi Bathtub Room": 1,
        "Premium Beach View Room": 1,
        "Medium Balcony Room": 2,
        "Economy Room": 2,
        "total": 6
    };

    window.allDateCounts = {};
    
    // Fetch booked dates from Google Script (with cache-busting)
    fetch(scriptURL + '?t=' + new Date().getTime())
        .then(res => res.json())
        .then(dateCounts => {
            window.allDateCounts = dateCounts;
            initCalendars(dateCounts);
        })
        .catch(err => {
            console.warn("Could not fetch availability dates. Using mock data.", err);
            // Mock data for demonstration
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            // Enhanced Mock Data: 13th and 14th (relative to today) are fully booked
            const d13 = new Date(); d13.setDate(13);
            const d14 = new Date(); d14.setDate(14);

            allDateCounts = {
                [formatDate(d13)]: { "jacuzzi": 1, "beach-view": 1, "medium-balcony": 2, "economy": 2, "total": 6 },
                [formatDate(d14)]: { "jacuzzi": 1, "beach-view": 1, "medium-balcony": 2, "economy": 2, "total": 6 }
            };
            initCalendars(allDateCounts);
        });

    function initCalendars(dateCounts) {
        const fpConfig = {
            minDate: "today",
            dateFormat: "Y-m-d",
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                const localDate = new Date(dayElem.dateObj.getTime() - (dayElem.dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                const data = dateCounts[localDate] || 0;
                let isFullyBooked = false;

                if (typeof data === 'number') {
                    isFullyBooked = data >= roomCapacities.total;
                } else if (typeof data === 'object') {
                    // Check if total or all specific rooms are full
                    isFullyBooked = data.total >= roomCapacities.total;
                }
                
                if (isFullyBooked) {
                    dayElem.style.backgroundColor = 'rgba(220, 53, 69, 0.15)'; 
                    dayElem.style.color = '#dc3545';
                    dayElem.style.fontWeight = 'bold';
                    dayElem.style.borderRadius = '4px';
                } else {
                    dayElem.style.backgroundColor = 'rgba(40, 167, 69, 0.15)'; 
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
            
            // Check for Room Full (Granular Room Check)
            if (isValid && (formId === 'homeBookingForm' || formId === 'mainBookingForm')) {
                const checkInInput = form.querySelector('input[name="checkIn"]') || form.querySelector('input[name="check-in"]');
                const roomTypeSelect = form.querySelector('select[name="roomType"]') || form.querySelector('select[name="room-type"]');
                
                if (checkInInput) {
                    const dateData = allDateCounts[checkInInput.value];
                    if (dateData) {
                        const selectedRoom = roomTypeSelect ? roomTypeSelect.value : 'total';
                        const capacity = roomCapacities[selectedRoom] || roomCapacities.total;
                        const booked = (typeof dateData === 'number') ? dateData : (dateData[selectedRoom] || dateData['total'] || 0);

                        if (booked >= capacity) {
                            const roomName = roomTypeSelect ? roomTypeSelect.options[roomTypeSelect.selectedIndex].text : "resort";
                            showFullModal(roomName);
                            isValid = false;
                        }
                    }
                }
            }

            if (isValid) {
                // Determine which form it is
                const btn = form.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.textContent = 'Checking...';
                btn.disabled = true;
                
                // Google Sheets Web App URL (Replace with your actual URL later)
                const targetURL = 'https://script.google.com/macros/s/AKfycbyWNr2c4swsLv5hG9HbhFK0krRNdqWO1n5S5W4QD-6oaxX158Qo4a9O7UUdKghnwqXx/exec';
                
                // If it's the home widget or main booking form, redirect to Book Now page
                if (formId === 'homeBookingForm' || formId === 'mainBookingForm') {
                    btn.textContent = 'Redirecting...';
                    
                    const formData = new FormData(form);
                    const params = new URLSearchParams();
                    
                    // Normalize parameter names for the book-now page
                    for (const [key, value] of formData.entries()) {
                        if (key === 'check-in') params.append('checkIn', value);
                        else if (key === 'check-out') params.append('checkOut', value);
                        else if (key === 'room-type') params.append('roomType', value);
                        else params.append(key, value);
                    }
                    
                    window.location.href = `book-now.html?${params.toString()}`;
                } else {
                    // Real submission for contact/newsletter to Google Sheets
                    const formData = new FormData(form);
                    // Add type for Google Script sorting
                    formData.append('type', formId === 'contactForm' ? 'contact' : 'newsletter');
                    
                    fetch(scriptURL, {
                        method: 'POST',
                        mode: 'no-cors',
                        body: formData
                    })
                    .then(() => {
                        alert('Thank you! Your message has been sent to Rajav Resort.');
                        form.reset();
                        btn.textContent = originalText;
                        btn.disabled = false;
                    })
                    .catch(err => {
                        console.error('Submission error:', err);
                        alert('Something went wrong. Please try again or contact us directly.');
                        btn.textContent = originalText;
                        btn.disabled = false;
                    });
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
       Modal Logic
       ========================================================================== */
    const fullModal = document.getElementById('full-modal');
    const closeButtons = document.querySelectorAll('.modal-close, .modal-btn-close');

    window.showFullModal = function(roomName = "resort") {
        if (!fullModal) return;
        const modalTitle = fullModal.querySelector('.modal-title');
        const modalBody = fullModal.querySelector('.modal-body p');
        
        if (modalTitle) modalTitle.textContent = "Fully Booked!";
        if (modalBody) {
            modalBody.textContent = `We're sorry, but the ${roomName} is already at full capacity for your selected date. Please choose a different date or another room type.`;
        }
        
        fullModal.classList.add('active');
        fullModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeFullModal() {
        if (!fullModal) return;
        fullModal.classList.remove('active');
        fullModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeFullModal);
    });

    // Close on overlay click
    if (fullModal) {
        fullModal.addEventListener('click', (e) => {
            if (e.target === fullModal) closeFullModal();
        });
    }

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
