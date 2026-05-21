document.addEventListener('DOMContentLoaded', () => {
    const finalForm = document.getElementById('finalBookingForm');
    const successModal = document.getElementById('success-modal');
    const paymentModal = document.getElementById('payment-modal');
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');

    // ========== ROOM PRICES & UPI CONFIG ==========
    // UPDATE THIS UPI ID with your actual Google Pay / UPI ID
    const UPI_ID = 'rajavresort@okaxis';
    const UPI_NAME = 'Rajav Resort';

    const ROOM_PRICES = {
        'Premium Jacuzzi Bathtub Room': 12000,
        'Premium Beach View Room': 10000,
        'Medium Balcony Room': 5000,
        'Economy Room': 3000,
        'Entire Resort Booking': 50000
    };

    function formatINR(amount) {
        return '₹' + amount.toLocaleString('en-IN');
    }

    function updatePriceDisplay(roomValue) {
        const priceDisplay = document.getElementById('price-display');
        const roomRate = document.getElementById('room-rate');
        const advanceAmount = document.getElementById('advance-amount');
        if (!priceDisplay || !roomRate || !advanceAmount) return;

        const price = ROOM_PRICES[roomValue];
        if (price) {
            roomRate.textContent = formatINR(price);
            advanceAmount.textContent = formatINR(Math.round(price / 2));
            priceDisplay.style.display = 'block';
        } else {
            priceDisplay.style.display = 'none';
        }
    }

    function updatePaymentModal(roomValue) {
        const price = ROOM_PRICES[roomValue] || 0;
        const advance = Math.round(price / 2);

        const paymentRoomName = document.getElementById('payment-room-name');
        const paymentRoomRate = document.getElementById('payment-room-rate');
        const paymentAdvance = document.getElementById('payment-advance-amount');
        const gpayAmount = document.getElementById('gpay-amount');
        const gpayBtn = document.getElementById('gpay-btn');

        if (paymentRoomName) paymentRoomName.textContent = roomValue;
        if (paymentRoomRate) paymentRoomRate.textContent = formatINR(price);
        if (paymentAdvance) paymentAdvance.textContent = formatINR(advance);
        if (gpayAmount) gpayAmount.textContent = formatINR(advance);

        if (gpayBtn && advance > 0) {
            const upiUrl = 'upi://pay?pa=' + encodeURIComponent(UPI_ID)
                + '&pn=' + encodeURIComponent(UPI_NAME)
                + '&am=' + advance
                + '&cu=INR'
                + '&tn=' + encodeURIComponent('Advance - ' + roomValue.substring(0, 15));
            gpayBtn.href = upiUrl;
        }
    }

    function updateSuccessModal(firstName, lastName, roomValue, checkIn, checkOut) {
        const price = ROOM_PRICES[roomValue] || 0;
        const advance = Math.round(price / 2);

        const successGuestName = document.getElementById('success-guest-name');
        const successRoomType = document.getElementById('success-room-type');
        const successDates = document.getElementById('success-dates');
        const successAdvancePaid = document.getElementById('success-advance-paid');

        if (successGuestName) successGuestName.textContent = firstName + ' ' + lastName;
        if (successRoomType) successRoomType.textContent = roomValue;
        if (successDates) successDates.textContent = checkIn + ' to ' + checkOut;
        if (successAdvancePaid) successAdvancePaid.textContent = formatINR(advance);
    }

    // Listen for room type changes to show price
    const roomTypeSelect = document.getElementById('room-type');
    if (roomTypeSelect) {
        roomTypeSelect.addEventListener('change', function() {
            updatePriceDisplay(this.value);
        });
        // If pre-filled from URL, show price immediately
        if (roomTypeSelect.value) {
            updatePriceDisplay(roomTypeSelect.value);
        }
    }
    
    // Define showFullModal locally so it works on this page
    const fullModal = document.getElementById('full-modal');
    window.showFullModal = function(roomName = "resort") {
        if (!fullModal) return;
        const modalTitle = fullModal.querySelector('.modal-title');
        const modalBody = fullModal.querySelector('.modal-body p');
        if (modalTitle) modalTitle.textContent = "Fully Booked!";
        if (modalBody) modalBody.textContent = `We're sorry, but the ${roomName} is already at full capacity for your selected date. Please choose a different date or contact our concierge.`;
        fullModal.classList.add('active');
        fullModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    // Parse URL Parameters to pre-fill the form
    const urlParams = new URLSearchParams(window.location.search);
    
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyWNr2c4swsLv5hG9HbhFK0krRNdqWO1n5S5W4QD-6oaxX158Qo4a9O7UUdKghnwqXx/exec';
    const targetURL = scriptURL;

    // --- Local booking cache (prevents double-booking before Google saves) ---
    const LOCAL_KEY = 'rajav_local_bookings';

    function getLocalBookings() {
        try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch(e) { return []; }
    }

    function saveLocalBooking(date, room) {
        const bookings = getLocalBookings();
        bookings.push({ date, room, ts: Date.now() });
        localStorage.setItem(LOCAL_KEY, JSON.stringify(bookings));
    }

    // Merge local bookings into the date counts from Google
    function mergeLocalBookings(dateCounts) {
        const bookings = getLocalBookings();
        const now = Date.now();
        bookings.forEach(b => {
            if (now - b.ts > 86400000) return; // Ignore entries older than 24h
            if (!dateCounts[b.date]) {
                dateCounts[b.date] = { total: 0, 'Premium Jacuzzi Bathtub Room': 0, 'Premium Beach View Room': 0, 'Medium Balcony Room': 0, 'Economy Room': 0, 'Entire Resort Booking': 0 };
            }
            dateCounts[b.date]['total'] = (dateCounts[b.date]['total'] || 0) + 1;
            dateCounts[b.date][b.room] = (dateCounts[b.date][b.room] || 0) + 1;
        });
        return dateCounts;
    }
    
    if (finalForm) {
        // Function to safely set input value if it exists
        const setInputValue = (name, value) => {
            if (!value) return;
            const input = finalForm.querySelector(`[name="${name}"]`);
            if (input) {
                input.value = value;
            }
        };

        // Check for specific parameter names we might pass from index.html
        // Handle different possible names from the two forms on index.html
        const checkIn = urlParams.get('checkIn') || urlParams.get('check-in');
        const checkOut = urlParams.get('checkOut') || urlParams.get('check-out');
        const guests = urlParams.get('guests');
        const roomType = urlParams.get('roomType') || urlParams.get('room-type');

        setInputValue('checkIn', checkIn);
        setInputValue('checkOut', checkOut);
        setInputValue('guests', guests);
        setInputValue('roomType', roomType);
        
        // Re-initialize flatpickr on these pre-filled dates
        import('https://cdn.jsdelivr.net/npm/flatpickr/+esm').then(module => {
            const flatpickr = module.default;
            flatpickr("#check-in", {
                minDate: "today",
                dateFormat: "Y-m-d",
                defaultDate: checkIn
            });
            
            flatpickr("#check-out", {
                minDate: "today",
                dateFormat: "Y-m-d",
                defaultDate: checkOut
            });
        }).catch(err => console.error("Flatpickr failed to load", err));

        // Setup Form Validation and Submission
        finalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitBtn = finalForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Checking...';
            submitBtn.disabled = true;

            // Perform a fresh availability check at the moment of submission
            fetch(scriptURL + '?nocache=' + new Date().getTime())
                .then(res => res.json())
                .then(dateCounts => {
                    // Merge local bookings so recent bookings are counted immediately
                    dateCounts = mergeLocalBookings(dateCounts);
                    window.allDateCounts = dateCounts;
                    let isValid = true;
                    
                    const inputs = finalForm.querySelectorAll('input[required], select[required], textarea[required]');
                    
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

                    // Final Check against the FRESH data
                    if (isValid) {
                        const checkInInput = finalForm.querySelector('input[name="checkIn"]');
                        const roomTypeInput = finalForm.querySelector('select[name="roomType"]');
                        
                        if (checkInInput) {
                             const dateData = dateCounts[checkInInput.value] || {};
                             const selectedRoom = roomTypeInput ? roomTypeInput.value : 'total';
                             const capacities = window.roomCapacities || { total: 6 };
                             
                             let isFull = false;
                             if (dateData["Entire Resort Booking"] > 0) {
                                 isFull = true;
                             } else if (selectedRoom === "Entire Resort Booking" && (dateData.total > 0)) {
                                 isFull = true;
                             } else {
                                 const capacity = capacities[selectedRoom] || 1;
                                 const booked = dateData[selectedRoom] || 0;
                                 isFull = booked >= capacity;
                             }

                             // Debug: log the comparison values
                             console.log('=== AVAILABILITY CHECK ===');
                             console.log('Date:', checkInInput.value);
                             console.log('Selected Room:', selectedRoom);
                             console.log('Date Data from Sheet:', JSON.stringify(dateData));
                             console.log('Is Full:', isFull);
                             console.log('All dateCounts:', JSON.stringify(dateCounts));

                             if (isFull) {
                                 const roomName = roomTypeInput ? roomTypeInput.options[roomTypeInput.selectedIndex].text : "resort";
                                 if (typeof window.showFullModal === 'function') {
                                     window.showFullModal(roomName);
                                 } else {
                                     alert(`Sorry, the ${roomName} is already full on this date.`);
                                 }
                                 isValid = false;
                                 submitBtn.textContent = originalBtnText;
                                 submitBtn.disabled = false;
                                 return; // Stop here
                             }
                        }
                    }

                    if (isValid) {
                        const checkInVal = finalForm.querySelector('input[name="checkIn"]').value;
                        const roomVal = finalForm.querySelector('select[name="roomType"]').value;

                        // Populate and open the payment modal
                        updatePaymentModal(roomVal);

                        submitBtn.textContent = originalBtnText;
                        submitBtn.disabled = false;

                        if (paymentModal) {
                            paymentModal.classList.add('active');
                            paymentModal.setAttribute('aria-hidden', 'false');
                            document.body.style.overflow = 'hidden';
                        }
                    } else {
                        submitBtn.textContent = originalBtnText;
                        submitBtn.disabled = false;
                    }
                })
                .catch(err => {
                    console.error("Availability check failed", err);
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                });
        });
    }

    // Handle Payment Modal Booking Confirmation
    if (confirmBookingBtn) {
        confirmBookingBtn.addEventListener('click', () => {
            const submitBtn = finalForm.querySelector('button[type="submit"]');
            const originalConfirmBtnText = confirmBookingBtn.textContent;
            
            confirmBookingBtn.textContent = 'Confirming Booking...';
            confirmBookingBtn.disabled = true;

            const formData = new FormData(finalForm);
            const queryString = new URLSearchParams(formData).toString();

            const checkInVal = finalForm.querySelector('input[name="checkIn"]').value;
            const roomVal = finalForm.querySelector('select[name="roomType"]').value;
            const checkOutVal = finalForm.querySelector('input[name="checkOut"]').value;
            const firstNameVal = finalForm.querySelector('input[name="firstName"]').value;
            const lastNameVal = finalForm.querySelector('input[name="lastName"]').value;

            // Save booking locally so next check is instant
            saveLocalBooking(checkInVal, roomVal);

            // Send data to Google Sheet
            fetch(targetURL, {
                method: 'POST',
                body: queryString,
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            })
            .then(res => res.json())
            .then(data => {
                confirmBookingBtn.textContent = originalConfirmBtnText;
                confirmBookingBtn.disabled = false;
                
                if (data.status === "BOOKING_FULL" || data.result === "error") {
                    // The backend rejected it due to race condition
                    if (paymentModal) {
                        paymentModal.classList.remove('active');
                        paymentModal.setAttribute('aria-hidden', 'true');
                    }
                    const roomName = finalForm.querySelector('select[name="roomType"]').options[finalForm.querySelector('select[name="roomType"]').selectedIndex].text;
                    if (typeof window.showFullModal === 'function') {
                        window.showFullModal(roomName);
                    } else {
                        alert(`Sorry, the ${roomName} is already full on this date.`);
                    }
                } else {
                    // Success!
                    if (paymentModal) {
                        paymentModal.classList.remove('active');
                        paymentModal.setAttribute('aria-hidden', 'true');
                    }
                    if (successModal) {
                        updateSuccessModal(firstNameVal, lastNameVal, roomVal, checkInVal, checkOutVal);
                        successModal.classList.add('active');
                        successModal.setAttribute('aria-hidden', 'false');
                        document.body.style.overflow = 'hidden';
                    }
                }
            })
            .catch(err => {
                console.error("Booking submission error:", err);
                // Fallback success if network error but request went through
                confirmBookingBtn.textContent = originalConfirmBtnText;
                confirmBookingBtn.disabled = false;
                if (paymentModal) {
                    paymentModal.classList.remove('active');
                    paymentModal.setAttribute('aria-hidden', 'true');
                }
                if (successModal) {
                    updateSuccessModal(firstNameVal, lastNameVal, roomVal, checkInVal, checkOutVal);
                    successModal.classList.add('active');
                    successModal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                }
            });
        });
    }

    // Modal Close Logic for Success Modal
    const closeButtons = document.querySelectorAll('.modal-close, .modal-btn-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            });
            document.body.style.overflow = '';
        });
    });

    function isValidEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
});
