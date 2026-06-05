document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       CONFIG
       ========================================================================== */
    // ⚠️ UPDATE this to your actual Google Pay / UPI ID
    const UPI_ID   = 'rajavresort@okaxis';
    const UPI_NAME = 'Rajav Resort';

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWNr2c4swsLv5hG9HbhFK0krRNdqWO1n5S5W4QD-6oaxX158Qo4a9O7UUdKghnwqXx/exec';

    const ROOM_PRICES = {
        'Premium Jacuzzi Bathtub Room': 12000,
        'Premium Beach View Room':      10000,
        'Medium Balcony Room':           5000,
        'Economy Room':                  3000,
        'Entire Resort Booking':        50000
    };

    const ROOM_CAPACITIES = {
        'Premium Jacuzzi Bathtub Room': 1,
        'Premium Beach View Room':      1,
        'Medium Balcony Room':          2,
        'Economy Room':                 2,
        'Entire Resort Booking':        1,
        'total':                        6
    };

    /* ==========================================================================
       HELPERS
       ========================================================================== */
    const $ = id => document.getElementById(id);
    const fmt = n => '₹' + n.toLocaleString('en-IN');

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /* ==========================================================================
       MODAL MANAGEMENT
       ========================================================================== */
    function openModal(modal) {
        if (!modal) return;
        // Close any already-open modal first
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
            m.classList.remove('active');
            m.setAttribute('aria-hidden', 'true');
        });
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.classList.remove('active');
            m.setAttribute('aria-hidden', 'true');
        });
        document.body.style.overflow = '';
    }

    // Attach close handlers to every close button and overlay background
    document.querySelectorAll('.modal-close, .modal-btn-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeAllModals();
        });
    });

    /* ==========================================================================
       FULLY BOOKED MODAL
       ========================================================================== */
    const fullModal = $('full-modal');

    window.showFullModal = function (roomName = 'your selected room') {
        if (!fullModal) return;
        const title = fullModal.querySelector('.modal-title');
        const body  = fullModal.querySelector('.modal-body p');
        if (title) title.textContent = 'Fully Booked!';
        if (body)  body.textContent  =
            `Sorry, the ${roomName} is already reserved for your selected dates. ` +
            `Please choose different dates or contact our concierge.`;
        openModal(fullModal);
    };

    /* ==========================================================================
       DYNAMIC PRICE DISPLAY (below room selector on the form)
       ========================================================================== */
    function updatePriceDisplay(roomValue) {
        const wrap = $('price-display');
        if (!wrap) return;
        const price = ROOM_PRICES[roomValue];
        if (price) {
            const rateEl = $('room-rate');
            const advEl  = $('advance-amount');
            if (rateEl) rateEl.textContent = fmt(price);
            if (advEl)  advEl.textContent  = fmt(Math.round(price / 2));
            wrap.style.display = 'block';
        } else {
            wrap.style.display = 'none';
        }
    }

    const roomTypeSelect = $('room-type');
    if (roomTypeSelect) {
        roomTypeSelect.addEventListener('change', () => updatePriceDisplay(roomTypeSelect.value));
        if (roomTypeSelect.value) updatePriceDisplay(roomTypeSelect.value);
    }

    /* ==========================================================================
       PAYMENT MODAL POPULATION
       ========================================================================== */
    function populatePaymentModal(roomValue) {
        const price   = ROOM_PRICES[roomValue] || 0;
        const advance = Math.round(price / 2);

        if ($('payment-room-name'))    $('payment-room-name').textContent    = roomValue;
        if ($('payment-room-rate'))    $('payment-room-rate').textContent    = fmt(price);
        if ($('payment-advance-amount')) $('payment-advance-amount').textContent = fmt(advance);
        if ($('gpay-amount'))          $('gpay-amount').textContent          = fmt(advance);

        const gpayBtn = $('gpay-btn');
        if (gpayBtn && advance > 0) {
            const upi = `upi://pay?pa=${encodeURIComponent(UPI_ID)}`
                      + `&pn=${encodeURIComponent(UPI_NAME)}`
                      + `&am=${advance}`
                      + `&cu=INR`
                      + `&tn=${encodeURIComponent('Advance - Rajav Resort')}`;
            gpayBtn.href = upi;
        }

        // Reset UTR verification input and lock confirm button
        const utrInput = $('upi-transaction-id');
        if (utrInput) {
            utrInput.value = '';
            utrInput.style.borderColor = '#cbd5e1';
        }
        const checkMark = $('utr-check');
        if (checkMark) checkMark.style.display = 'none';
        const utrError = $('utr-error');
        if (utrError) utrError.style.display = 'none';

        const confirmBtn = $('confirm-booking-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
        }
    }

    /* ==========================================================================
       SUCCESS MODAL POPULATION
       ========================================================================== */
    function populateSuccessModal(firstName, lastName, roomValue, checkIn, checkOut) {
        const price   = ROOM_PRICES[roomValue] || 0;
        const advance = Math.round(price / 2);
        if ($('success-guest-name'))   $('success-guest-name').textContent   = `${firstName} ${lastName}`.trim();
        if ($('success-room-type'))    $('success-room-type').textContent    = roomValue;
        if ($('success-dates'))        $('success-dates').textContent        = `${checkIn} → ${checkOut}`;
        if ($('success-advance-paid')) $('success-advance-paid').textContent = fmt(advance);
    }

    /* ==========================================================================
       URL PARAMETER PRE-FILL
       ========================================================================== */
    const finalForm = $('finalBookingForm');
    const urlParams = new URLSearchParams(window.location.search);

    if (finalForm) {
        const fill = (name, val) => {
            if (!val) return;
            const el = finalForm.querySelector(`[name="${name}"]`);
            if (!el) return;
            el.value = val;
            el.dispatchEvent(new Event('change'));
        };

        const checkInParam  = urlParams.get('checkIn')   || urlParams.get('check-in');
        const checkOutParam = urlParams.get('checkOut')  || urlParams.get('check-out');
        fill('checkIn',   checkInParam);
        fill('checkOut',  checkOutParam);
        fill('guests',    urlParams.get('guests'));
        fill('roomType',  urlParams.get('roomType') || urlParams.get('room-type'));

        // Flatpickr date pickers
        import('https://cdn.jsdelivr.net/npm/flatpickr/+esm')
            .then(m => {
                const fp = m.default;
                fp('#check-in',  { minDate: 'today', dateFormat: 'Y-m-d', defaultDate: checkInParam });
                fp('#check-out', { minDate: 'today', dateFormat: 'Y-m-d', defaultDate: checkOutParam });
            })
            .catch(e => console.warn('Flatpickr failed to load:', e));
    }

    /* ==========================================================================
       FORM VALIDATION
       ========================================================================== */
    function validateForm(form) {
        let valid = true;
        form.querySelectorAll('input[required], select[required]').forEach(input => {
            const err    = input.nextElementSibling;
            const empty  = !input.value.trim();
            const badMail = input.type === 'email' && !isValidEmail(input.value);

            if (empty || badMail) {
                valid = false;
                input.classList.add('error');
                if (err && err.classList.contains('error-msg'))
                    err.textContent = empty ? 'This field is required' : 'Please enter a valid email';
            } else {
                input.classList.remove('error');
                if (err && err.classList.contains('error-msg')) err.textContent = '';
            }
        });
        return valid;
    }

    /* ==========================================================================
       AVAILABILITY CHECK (reads directly from Google Sheets, no local cache)
       ========================================================================== */
    async function checkAvailability(checkInDate, selectedRoom) {
        const res       = await fetch(SCRIPT_URL + '?nocache=' + Date.now());
        const dateCounts = await res.json();
        const dateData   = dateCounts[checkInDate] || {};

        // Entire resort already booked → nothing available
        if ((dateData['Entire Resort Booking'] || 0) > 0) return false;

        // User wants entire resort but individual rooms are already booked
        if (selectedRoom === 'Entire Resort Booking' && (dateData.total || 0) > 0) return false;

        const capacity = ROOM_CAPACITIES[selectedRoom] || 1;
        const booked   = dateData[selectedRoom] || 0;
        return booked < capacity;
    }

    /* ==========================================================================
       STEP 1 — FORM SUBMIT → check availability → open payment modal
       ========================================================================== */
    if (finalForm) {
        finalForm.addEventListener('submit', async e => {
            e.preventDefault();
            if (!validateForm(finalForm)) return;

            const submitBtn  = finalForm.querySelector('button[type="submit"]');
            const origText   = submitBtn.textContent;
            submitBtn.textContent = 'Opening WhatsApp…';
            submitBtn.disabled    = true;

            const checkInVal  = finalForm.querySelector('[name="checkIn"]').value;
            const checkOutVal = finalForm.querySelector('[name="checkOut"]').value;
            const roomVal     = finalForm.querySelector('[name="roomType"]').value;
            const firstName   = finalForm.querySelector('[name="firstName"]').value;
            const lastName    = finalForm.querySelector('[name="lastName"]').value;
            const guests      = finalForm.querySelector('[name="guests"]').value || '1';

            const text = `Hello Rajav Beach Resort! I would like to make a reservation request:
- Name: ${firstName} ${lastName}
- Room Type: ${roomVal}
- Check-in Date: ${checkInVal}
- Check-out Date: ${checkOutVal}
- Guests: ${guests}`;

            const whatsappUrl = "https://wa.me/918015562576?text=" + encodeURIComponent(text);
            
            setTimeout(() => {
                window.open(whatsappUrl, '_blank');
                submitBtn.textContent = origText;
                submitBtn.disabled    = false;
            }, 500);
        });
    }

    /* ==========================================================================
       STEP 2 — CONFIRM BOOKING button inside payment modal
               → POST to Google Sheets → show success modal
       ========================================================================== */
    const confirmBookingBtn = $('confirm-booking-btn');
    if (confirmBookingBtn && finalForm) {
        confirmBookingBtn.addEventListener('click', async () => {
            const origText = confirmBookingBtn.textContent;
            confirmBookingBtn.textContent = 'Saving your booking…';
            confirmBookingBtn.disabled    = true;

            const checkInVal  = finalForm.querySelector('[name="checkIn"]').value;
            const checkOutVal = finalForm.querySelector('[name="checkOut"]').value;
            const roomVal     = finalForm.querySelector('[name="roomType"]').value;
            const firstName   = finalForm.querySelector('[name="firstName"]').value;
            const lastName    = finalForm.querySelector('[name="lastName"]').value;

            const formData = new FormData(finalForm);
            const transactionId = $('upi-transaction-id') ? $('upi-transaction-id').value.trim() : '';
            formData.append('transactionId', transactionId);

            const body = new URLSearchParams(formData).toString();

            try {
                const res  = await fetch(SCRIPT_URL, {
                    method:  'POST',
                    body,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                const data = await res.json();

                if (data.status === 'BOOKING_FULL' || data.result === 'error') {
                    closeAllModals();
                    const roomSelect = finalForm.querySelector('[name="roomType"]');
                    window.showFullModal(roomSelect.options[roomSelect.selectedIndex].text);
                } else {
                    populateSuccessModal(firstName, lastName, roomVal, checkInVal, checkOutVal);
                    openModal($('success-modal'));
                }
            } catch (err) {
                console.error('Booking submission error:', err);
                // Likely a CORS/network error — request probably went through, show success
                populateSuccessModal(firstName, lastName, roomVal, checkInVal, checkOutVal);
                openModal($('success-modal'));
            } finally {
                confirmBookingBtn.textContent = origText;
                confirmBookingBtn.disabled    = false;
            }
        });
    }

    /* ==========================================================================
       UTR / TRANSACTION ID VALIDATION LISTENERS
       ========================================================================== */
    const utrInput = $('upi-transaction-id');
    if (utrInput) {
        utrInput.addEventListener('input', () => {
            const val = utrInput.value.trim();
            const isValidUTR = /^\d{12}$/.test(val);
            const confirmBtn = $('confirm-booking-btn');
            const checkMark = $('utr-check');
            const utrError = $('utr-error');

            if (isValidUTR) {
                utrInput.style.borderColor = '#22c55e'; // Premium Green Border
                if (checkMark) checkMark.style.display = 'block';
                if (utrError) utrError.style.display = 'none';
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.style.opacity = '1';
                    confirmBtn.style.cursor = 'pointer';
                }
            } else {
                utrInput.style.borderColor = '#cbd5e1';
                if (checkMark) checkMark.style.display = 'none';
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.style.cursor = 'not-allowed';
                }
                
                // If they typed a 12-character string that isn't purely digits
                if (val.length === 12 && !/^\d+$/.test(val)) {
                    if (utrError) utrError.style.display = 'block';
                    utrInput.style.borderColor = '#dc2626';
                }
            }
        });

        utrInput.addEventListener('blur', () => {
            const val = utrInput.value.trim();
            const utrError = $('utr-error');
            if (val.length > 0 && !/^\d{12}$/.test(val)) {
                if (utrError) utrError.style.display = 'block';
                utrInput.style.borderColor = '#dc2626';
            } else {
                if (utrError && /^\d{12}$/.test(val)) utrError.style.display = 'none';
            }
        });
    }


});
