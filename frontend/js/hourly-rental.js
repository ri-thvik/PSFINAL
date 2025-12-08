// ==================== HOURLY RENTAL FUNCTIONS ====================

/**
 * Set ride mode (Normal/Electric)
 */
function setRideMode(mode) {
    selectedRideMode = mode;

    // Update button active states
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Recalculate fares
    if (selectedBookingType === 'hourly') {
        updateVehicleCardsForHourly();
        if (selectedHours && selectedVehicleType) {
            updateHourlyFareDisplay();
        }
    } else {
        // Re-calculate distance-based fares with EV discount
        if (window.lastCalculatedDistance) {
            window.mapFunctions.calculateFare(window.lastCalculatedDistance);
        }
    }
}

/**
 * Set booking type (Point-to-Point/Hourly)
 */
function setBookingType(type) {
    selectedBookingType = type;

    // Update button active states
    document.querySelectorAll('.booking-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    const hourSelector = document.getElementById('hour-selector');
    const confirmBtn = document.querySelector('.btn-book');

    if (type === 'hourly') {
        // Show hour selector
        if (hourSelector) {
            hourSelector.style.display = 'block';
        }

        // Reset selections  
        selectedHours = null;
        document.querySelectorAll('.hour-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Disable confirm button until hours selected
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }

        // Update vehicle cards to show hourly rates
        updateVehicleCardsForHourly();
    } else {
        // Hide hour selector
        if (hourSelector) {
            hourSelector.style.display = 'none';
        }

        // Reset
        selectedHours = null;

        // Enable confirm button if vehicle selected
        if (confirmBtn) {
            confirmBtn.disabled = !selectedVehicleType;
        }

        // Restore point-to-point fares
        if (window.lastCalculatedDistance) {
            window.mapFunctions.calculateFare(window.lastCalculatedDistance);
        }
    }
}

/**
 * Select rental duration in hours
 */
function selectHours(hours) {
    selectedHours = hours;

    // Update button active states
    document.querySelectorAll('.hour-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.hours) === hours);
    });

    // Enable confirm button if vehicle selected
    const confirmBtn = document.querySelector('.btn-book');
    if (confirmBtn && selectedVehicleType) {
        confirmBtn.disabled = false;
    }

    // Update fare display
    if (selectedVehicleType) {
        updateHourlyFareDisplay();
    }
}

/**
 * Update vehicle cards to show hourly rates
 */
function updateVehicleCardsForHourly() {
    document.querySelectorAll('.vehicle-option').forEach(card => {
        const type = card.dataset.type;
        const rate = HOURLY_RATES[type][selectedRideMode];
        const priceElement = card.querySelector('.price-amount');
        const priceLabel = card.querySelector('.price');

        if (priceElement && priceLabel) {
            priceElement.textContent = rate;
            priceLabel.innerHTML = `₹<span class="price-amount">${rate}</span><small>/hr</small>`;
        }
    });
}

/**
 * Update hourly fare display for selected vehicle and hours
 */
function updateHourlyFareDisplay() {
    if (!selectedVehicleType || !selectedHours) return;

    const hourlyRate = HOURLY_RATES[selectedVehicleType][selectedRideMode];
    const totalFare = hourlyRate * selectedHours;

    // Calculate savings if EV mode
    const savings = selectedRideMode === 'electric' ?
        (HOURLY_RATES[selectedVehicleType].normal - HOURLY_RATES[selectedVehicleType].electric) * selectedHours : 0;

    // Update selected vehicle card
    const activeCard = document.querySelector(`[data-type="${selectedVehicleType}"]`);
    if (activeCard) {
        const priceAmount = activeCard.querySelector('.price-amount');
        const priceLabel = activeCard.querySelector('.price');

        if (priceAmount && priceLabel) {
            priceAmount.textContent = totalFare;

            let priceHTML = `₹<span class="price-amount">${totalFare}</span><small> for ${selectedHours}hr${selectedHours > 1 ? 's' : ''}</small>`;

            if (savings > 0) {
                priceHTML += `<div style="font-size: 12px; color: #10b981; margin-top: 4px;">
                    <i class="fas fa-leaf"></i> Save ₹${savings}
                </div>`;
            }

            priceLabel.innerHTML = priceHTML;
        }
    }
}

/**
 * Make global so HTML onclick can access
 */
window.setRideMode = setRideMode;
window.setBookingType = setBookingType;
window.selectHours = selectHours;
