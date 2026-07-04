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
        "Entire Resort Booking": 1,
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
            disableMobile: true,
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                const localDate = new Date(dayElem.dateObj.getTime() - (dayElem.dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                const data = dateCounts[localDate] || 0;
                let isFullyBooked = false;

                if (typeof data === 'number') {
                    isFullyBooked = data >= roomCapacities.total;
                } else if (typeof data === 'object') {
                    isFullyBooked = data.total >= roomCapacities.total || data["Entire Resort Booking"] > 0;
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

        const inputIds = ["#check-in-home", "#check-out-home", "#check-in", "#check-out"];
        let initialized = false;

        const loadAndInit = () => {
            if (initialized) return;
            initialized = true;

            inputIds.forEach(id => {
                const el = document.querySelector(id);
                if (el) {
                    el.removeEventListener('focus', loadAndInit);
                    el.removeEventListener('click', loadAndInit);
                    el.removeEventListener('mouseenter', loadAndInit);
                }
            });

            import('https://cdn.jsdelivr.net/npm/flatpickr/+esm').then(module => {
                const flatpickr = module.default;
                inputIds.forEach(id => {
                    if (document.querySelector(id)) {
                        flatpickr(id, fpConfig);
                    }
                });
                
                // If the user already focused/clicked an input, trigger its click to open flatpickr calendar dropdown
                const activeEl = document.activeElement;
                if (activeEl && inputIds.includes('#' + activeEl.id)) {
                    // Slight delay to allow flatpickr instance to bind correctly
                    setTimeout(() => {
                        activeEl.click();
                    }, 50);
                }
            }).catch(err => console.error("Flatpickr failed to load", err));
        };

        inputIds.forEach(id => {
            const el = document.querySelector(id);
            if (el) {
                el.addEventListener('focus', loadAndInit, { passive: true });
                el.addEventListener('click', loadAndInit, { passive: true });
                el.addEventListener('mouseenter', loadAndInit, { passive: true });
            }
        });
    }

    /* ==========================================================================
       Header & Navigation
       ========================================================================== */
    const header = document.getElementById('header');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const primaryNav = document.getElementById('primary-nav');
    const navLinks = document.querySelectorAll('.nav-links a');

    // Scroll Header (Optimized with IntersectionObserver to prevent forced reflow)
    if (header) {
        const sentinel = document.createElement('div');
        sentinel.style.position = 'absolute';
        sentinel.style.top = '0';
        sentinel.style.left = '0';
        sentinel.style.height = '50px';
        sentinel.style.width = '1px';
        sentinel.style.pointerEvents = 'none';
        sentinel.style.visibility = 'hidden';
        document.body.prepend(sentinel);

        const headerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            });
        }, {
            root: null,
            threshold: 0
        });

        headerObserver.observe(sentinel);
    }

    // Mobile Menu Toggle — guarded so pages without a mobile nav don't crash
    if (mobileMenuToggle && primaryNav) {
        const toggleMenu = () => {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
            mobileMenuToggle.classList.toggle('active');
            primaryNav.classList.toggle('active');
            document.body.style.overflow = isExpanded ? '' : 'hidden';
        };

        mobileMenuToggle.addEventListener('click', toggleMenu);

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (primaryNav.classList.contains('active')) toggleMenu();
            });
        });
    }

    /* ==========================================================================
       Smooth Scrolling & Active Link Highlights (Optimized with IntersectionObserver)
       ========================================================================== */
    const sections = document.querySelectorAll('section[id]');
    
    // Active Link Highlighting using IntersectionObserver
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px', // Adjust to trigger when section is well within view
        threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.getAttribute('id');
                const link = document.querySelector(`.nav-links a[href*="#${sectionId}"]`);
                
                // Remove active class from all links
                document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
                
                // Add active class to current link
                if (link) {
                    link.classList.add('active');
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

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
                        const roomKeyMap = {
                            'jacuzzi': 'Premium Jacuzzi Bathtub Room',
                            'beach-view': 'Premium Beach View Room',
                            'medium-balcony': 'Medium Balcony Room',
                            'economy': 'Economy Room',
                            'entire-resort': 'Entire Resort Booking'
                        };
                        const selectedRaw = roomTypeSelect ? roomTypeSelect.value : 'total';
                        const selectedRoom = roomKeyMap[selectedRaw] || selectedRaw;
                        
                        let isFull = false;
                        if (dateData["Entire Resort Booking"] > 0) {
                            isFull = true;
                        } else if (selectedRoom === "Entire Resort Booking" && (dateData.total > 0)) {
                            isFull = true;
                        } else {
                            const capacity = roomCapacities[selectedRoom] || roomCapacities.total;
                            const booked = (typeof dateData === 'number') ? dateData : (dateData[selectedRoom] || dateData['total'] || 0);
                            isFull = booked >= capacity;
                        }

                        if (isFull) {
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
                
                // If it's the home widget or main booking form, redirect to WhatsApp
                if (formId === 'homeBookingForm' || formId === 'mainBookingForm') {
                    btn.textContent = 'Opening WhatsApp...';
                    
                    const formData = new FormData(form);
                    const checkIn = formData.get('check-in') || formData.get('checkIn') || 'Not selected';
                    const checkOut = formData.get('check-out') || formData.get('checkOut') || 'Not selected';
                    const roomType = formData.get('room-type') || formData.get('roomType') || 'Not selected';
                    const guests = formData.get('guests') || '1';
                    
                    const text = `Hello Rajav Beach Resort! I would like to inquire about a booking:
- Room Type: ${roomType}
- Check-in Date: ${checkIn}
- Check-out Date: ${checkOut}
- Guests: ${guests}`;

                    const whatsappUrl = "https://wa.me/918015562576?text=" + encodeURIComponent(text);
                    
                    setTimeout(() => {
                        window.open(whatsappUrl, '_blank');
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }, 500);
                } else {
                    // Real submission for contact/newsletter to Google Sheets
                    const formData = new FormData(form);
                    // Add a 'type' flag so your Apps Script knows to send it to the new tab
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

    // Newsletter form — custom handler with auto-reply support
    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterSuccess = document.getElementById('newsletter-success');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = newsletterForm.querySelector('input[name="name"]');
            const emailInput = newsletterForm.querySelector('input[name="email"]');
            let valid = true;

            if (nameInput && !nameInput.value.trim()) { nameInput.style.borderColor = '#dc3545'; valid = false; } else if (nameInput) { nameInput.style.borderColor = ''; }
            if (!emailInput.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) { emailInput.style.borderColor = '#dc3545'; valid = false; } else { emailInput.style.borderColor = ''; }

            if (!valid) return;

            const btn = newsletterForm.querySelector('button[type="submit"]');
            btn.textContent = 'Subscribing...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('type', 'newsletter');
            formData.append('name', nameInput ? nameInput.value.trim() : '');
            formData.append('email', emailInput.value.trim());
            formData.append('replyTo', 'info@rajavbeachresort.com');

            fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: formData })
                .then(() => {
                    newsletterForm.style.display = 'none';
                    if (newsletterSuccess) newsletterSuccess.style.display = 'block';
                })
                .catch(() => {
                    // Even on network error, show success (no-cors means we can't read response)
                    newsletterForm.style.display = 'none';
                    if (newsletterSuccess) newsletterSuccess.style.display = 'block';
                });
        });
    }

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
    
    /* ==========================================================================
       Dark Mode Toggle Logic
       ========================================================================== */
    const brandLogo = document.querySelector('.brand-logo');
    if (brandLogo && brandLogo.parentNode) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'dark-mode-toggle';
        toggleBtn.setAttribute('aria-label', 'Toggle Dark Mode');
        toggleBtn.innerHTML = `
            <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none; width:18px; height:18px;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px; height:18px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        `;
        // Insert after logo inside header
        brandLogo.parentNode.insertBefore(toggleBtn, brandLogo.nextSibling);
        
        // Check local storage for theme preference
        const currentTheme = localStorage.getItem('theme') || 'light';
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-mode');
            toggleBtn.querySelector('.sun-icon').style.display = 'block';
            toggleBtn.querySelector('.moon-icon').style.display = 'none';
        }
        
        // Toggle theme on click
        toggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            toggleBtn.querySelector('.sun-icon').style.display = isDark ? 'block' : 'none';
            toggleBtn.querySelector('.moon-icon').style.display = isDark ? 'none' : 'block';
        });
    }

    /* ==========================================================================
       Testimonials "Read More" Truncation Logic
       ========================================================================== */
    const testimonialTexts = document.querySelectorAll('.testimonial-text');
    testimonialTexts.forEach(p => {
        const fullHTML = p.innerHTML;
        const plainText = p.textContent.trim();
        if (plainText.length > 200) {
            const truncatedText = plainText.substring(0, 160) + '...';
            p.textContent = truncatedText;
            
            const readMoreBtn = document.createElement('button');
            readMoreBtn.className = 'read-more-btn';
            readMoreBtn.textContent = 'Read More';
            readMoreBtn.style.cssText = 'background:none; border:none; color:var(--clr-secondary); font-weight:600; cursor:pointer; font-size:0.85rem; display:inline-block; margin-top:0.5rem; padding:0; outline:none; text-transform:uppercase; letter-spacing:1px;';
            
            readMoreBtn.addEventListener('click', () => {
                if (readMoreBtn.textContent === 'Read More') {
                    p.innerHTML = fullHTML;
                    readMoreBtn.textContent = 'Read Less';
                } else {
                    p.textContent = truncatedText;
                    readMoreBtn.textContent = 'Read More';
                }
            });
            p.parentNode.insertBefore(readMoreBtn, p.nextSibling);
        }
    });

});
