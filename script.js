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
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                const localDate = new Date(dayElem.dateObj.getTime() - (dayElem.dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                const data = dateCounts[localDate] || 0;
                let isFullyBooked = false;

                if (typeof data === 'number') {
                    isFullyBooked = data >= roomCapacities.total;
                } else if (typeof data === 'object') {
                    // Check if total or all specific rooms are full, or Entire Resort is booked
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

        import('https://cdn.jsdelivr.net/npm/flatpickr/+esm').then(module => {
            const flatpickr = module.default;
            flatpickr("#check-in-home", fpConfig);
            flatpickr("#check-out-home", fpConfig);
            flatpickr("#check-in", fpConfig); // Main form
            flatpickr("#check-out", fpConfig); // Main form
        }).catch(err => console.error("Flatpickr failed to load", err));
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
       Temporary Booking Suspension (Notice Modal & Redirects)
       ========================================================================== */
    
    // 1. Inject Popup Notice HTML dynamically
    const injectBookingNotice = () => {
        const noticeHTML = `
            <div id="booking-notice" class="booking-notice-overlay" aria-hidden="true" role="dialog" aria-labelledby="booking-notice-title">
                <div class="booking-notice-modal">
                    <div class="booking-notice-icon">📢</div>
                    <h2 id="booking-notice-title" class="booking-notice-title">Fully Booked for This Month</h2>
                    <p class="booking-notice-message">
                        We have temporarily closed direct online bookings as <strong>our resort is fully booked for this month</strong>.
                        <br><br>
                        However, we still accept reservation inquiries, waitlist requests, and future bookings! Please click below to connect with us on WhatsApp.
                    </p>
                    <div class="booking-notice-actions">
                        <button class="btn-notice-whatsapp" id="btn-notice-whatsapp">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                            <span>Chat on WhatsApp</span>
                        </button>
                        <button class="btn-notice-close" id="btn-notice-close">Continue to Website</button>
                    </div>
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = noticeHTML.trim();
        document.body.appendChild(div.firstChild);
    };

    injectBookingNotice();

    const noticeOverlay = document.getElementById('booking-notice');
    const closeNoticeBtn = document.getElementById('btn-notice-close');
    const whatsappNoticeBtn = document.getElementById('btn-notice-whatsapp');

    const closeNoticeModal = () => {
        if (noticeOverlay) {
            noticeOverlay.classList.remove('active');
            noticeOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            sessionStorage.setItem('booking_notice_shown', 'true');
        }
    };

    // Show popup only if not shown in current session
    if (!sessionStorage.getItem('booking_notice_shown')) {
        setTimeout(() => {
            if (noticeOverlay) {
                noticeOverlay.classList.add('active');
                noticeOverlay.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            }
        }, 1000);
    }

    closeNoticeBtn?.addEventListener('click', closeNoticeModal);
    
    noticeOverlay?.addEventListener('click', (e) => {
        if (e.target === noticeOverlay) {
            closeNoticeModal();
        }
    });

    whatsappNoticeBtn?.addEventListener('click', () => {
        const whatsappUrl = "https://wa.me/918015562576?text=" + encodeURIComponent("Hello Rajav Beach Resort! I saw online bookings for this month are full, but I would like to inquire about booking a stay.");
        window.open(whatsappUrl, '_blank');
        closeNoticeModal();
    });

    // 2. Intercept ALL clicks on links referencing 'book-now' or containing 'booking'
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (anchor) {
            const href = anchor.getAttribute('href');
            if (href && (href.includes('book-now') || href.includes('booking'))) {
                e.preventDefault();
                
                let text = "Hello Rajav Beach Resort! I would like to inquire about booking a room.";
                
                try {
                    const urlParts = href.split('?');
                    if (urlParts.length > 1) {
                        const params = new URLSearchParams(urlParts[1]);
                        const roomType = params.get('roomType') || params.get('room-type');
                        if (roomType) {
                            text = `Hello Rajav Beach Resort! I would like to inquire about booking the *${roomType}*.`;
                        }
                    }
                } catch (err) {
                    console.warn("Could not parse query parameters in booking link", err);
                }
                
                const whatsappUrl = "https://wa.me/918015562576?text=" + encodeURIComponent(text);
                window.open(whatsappUrl, '_blank');
            }
        }
    });
});
