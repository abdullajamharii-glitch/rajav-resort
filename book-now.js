document.addEventListener('DOMContentLoaded', () => {
    const finalForm = document.getElementById('finalBookingForm');
    const successModal = document.getElementById('success-modal');
    
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
                dateCounts[b.date] = { total: 0, 'Premium Jacuzzi Bathtub Room': 0, 'Premium Beach View Room': 0, 'Medium Balcony Room': 0, 'Economy Room': 0 };
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
                            const capacity = capacities[selectedRoom] || 1;
                            const booked = dateData[selectedRoom] || 0;

                            // Debug: log the comparison values
                            console.log('=== AVAILABILITY CHECK ===');
                            console.log('Date:', checkInInput.value);
                            console.log('Selected Room:', selectedRoom);
                            console.log('Date Data from Sheet:', JSON.stringify(dateData));
                            console.log('Booked:', booked, '/ Capacity:', capacity);
                            console.log('All dateCounts:', JSON.stringify(dateCounts));

                            if (booked >= capacity) {
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
                        submitBtn.textContent = 'Processing...';
                        const formData = new FormData(finalForm);
                        const queryString = new URLSearchParams(formData).toString();

                        // Save booking locally so next check is instant
                        const checkInVal = finalForm.querySelector('input[name="checkIn"]').value;
                        const roomVal = finalForm.querySelector('select[name="roomType"]').value;
                        saveLocalBooking(checkInVal, roomVal);

                        // Send data
                        fetch(targetURL, {
                            method: 'POST',
                            body: queryString,
                            headers: { "Content-Type": "application/x-www-form-urlencoded" }
                        })
                        .then(res => res.json())
                        .then(data => {
                            submitBtn.textContent = originalBtnText;
                            submitBtn.disabled = false;
                            
                            if (data.status === "BOOKING_FULL" || data.result === "error") {
                                // The backend rejected it due to race condition
                                const roomName = finalForm.querySelector('select[name="roomType"]').options[finalForm.querySelector('select[name="roomType"]').selectedIndex].text;
                                if (typeof window.showFullModal === 'function') {
                                    window.showFullModal(roomName);
                                } else {
                                    alert(`Sorry, the ${roomName} is already full on this date.`);
                                }
                            } else {
                                // Success!
                                if (successModal) {
                                    successModal.classList.add('active');
                                    successModal.setAttribute('aria-hidden', 'false');
                                    document.body.style.overflow = 'hidden';
                                }
                            }
                        })
                        .catch(err => {
                            console.error("Booking submission error:", err);
                            // Fallback success if network error but request went through
                            submitBtn.textContent = originalBtnText;
                            submitBtn.disabled = false;
                            if (successModal) {
                                successModal.classList.add('active');
                                successModal.setAttribute('aria-hidden', 'false');
                                document.body.style.overflow = 'hidden';
                            }
                        });

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
