const { useState, useEffect, createContext, useContext } = React;

// Create Context
const RideContext = createContext();

// Mock Data
const RIDES = [
    { id: 'bike', name: 'Bike', seats: 1, basePrice: 20, timeScale: 1, icon: 'fa-motorcycle' },
    { id: 'auto', name: 'Auto', seats: 3, basePrice: 30, timeScale: 1.5, icon: 'fa-taxi' },
    { id: 'car', name: 'Car', seats: 4, basePrice: 50, timeScale: 2, icon: 'fa-car' }
];

function RideBookingApp() {
    const [view, setView] = useState('LOCATION_SELECT'); // LOCATION_SELECT, RIDE_SELECT, SEARCHING, ON_TRIP
    const [pickup, setPickup] = useState(null);
    const [drop, setDrop] = useState(null);
    const [selectedRide, setSelectedRide] = useState(null);
    const [fareEstimates, setFareEstimates] = useState({});

    // Listen for events from legacy JS
    useEffect(() => {
        const handleLocationUpdate = (e) => {
            const { type, location } = e.detail;
            if (type === 'pickup') setPickup(location);
            if (type === 'drop') setDrop(location);
        };

        const handleShowVehicles = () => {
            setView('RIDE_SELECT');
            // Select default ride
            setSelectedRide('bike');
        };

        const handleReset = () => {
            setView('LOCATION_SELECT');
            setPickup(null);
            setDrop(null);
            setSelectedRide(null);
        };

        const handleViewUpdate = (e) => {
            const { view, driver, otp } = e.detail;
            if (view) setView(view);
            if (driver) window.currentDriver = driver; // Quick hack for global access in component
            if (otp) window.currentTripOtp = otp;
        };

        window.addEventListener('location-update', handleLocationUpdate);
        window.addEventListener('show-vehicles', handleShowVehicles);
        window.addEventListener('reset-booking', handleReset);
        window.addEventListener('view-update', handleViewUpdate);

        return () => {
            window.removeEventListener('location-update', handleLocationUpdate);
            window.removeEventListener('show-vehicles', handleShowVehicles);
            window.removeEventListener('reset-booking', handleReset);
            window.removeEventListener('view-update', handleViewUpdate);
        };
    }, []);

    // Helper to calculate dummy fares if not provided
    useEffect(() => {
        if (view === 'RIDE_SELECT') {
            // Basic randomizer if real calc missing, though rider.js should handle this
            const baseDist = Math.floor(Math.random() * 5) + 2;
            const estimates = {};
            RIDES.forEach(ride => {
                estimates[ride.id] = ride.basePrice + (baseDist * 10);
            });
            setFareEstimates(estimates);
        }
    }, [view]);


    const handleRideSelect = (rideId) => {
        setSelectedRide(rideId);
        // Sync with legacy global
        if (window.selectVehicle) window.selectVehicle(rideId);
    };

    const handleConfirmBooking = () => {
        // Trigger legacy booking flow
        if (window.confirmBooking) window.confirmBooking();
    };

    const handleLocationClick = (type) => {
        if (window.openLocationSearch) window.openLocationSearch(type);
    };

    return (
        <div className="floating-panel-container">
            {view === 'LOCATION_SELECT' && (
                <LocationSelection
                    pickup={pickup}
                    drop={drop}
                    onLocationClick={handleLocationClick}
                />
            )}
            {view === 'RIDE_SELECT' && (
                <RideSelection
                    selectedRide={selectedRide}
                    onSelect={handleRideSelect}
                    estimates={fareEstimates}
                    onConfirm={handleConfirmBooking}
                    onBack={() => setView('LOCATION_SELECT')}
                />
            )}
            {view === 'SEARCHING' && (
                <div className="ui-card">
                    <div className="ui-header">
                        <h3 className="ui-title">Finding your ride...</h3>
                    </div>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '40px', color: '#000' }}></i>
                        <p style={{ marginTop: '20px' }}>Connecting you with nearby drivers</p>
                        <button className="confirm-btn" style={{ background: '#EB4D4B' }} onClick={() => window.cancelSearch()}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {view === 'DRIVER_FOUND' && (
                <div className="ui-card">
                    <div className="ui-header">
                        <h3 className="ui-title">Driver found!</h3>
                    </div>
                    <div style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ width: '50px', height: '50px', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-user"></i>
                            </div>
                            <div style={{ marginLeft: '12px' }}>
                                <div style={{ fontWeight: 'bold' }}>{window.currentDriver?.name || 'Driver'}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{window.currentDriver?.vehicleModel || 'Vehicle'} • {window.currentDriver?.vehicleNumber}</div>
                            </div>
                            <div style={{ marginLeft: 'auto', fontWeight: 'bold' }}>
                                <i className="fas fa-star" style={{ color: '#f1c40f' }}></i> {window.currentDriver?.rating || '4.8'}
                            </div>
                        </div>
                        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', textAlign: 'center', marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: '#666' }}>OTP</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '4px' }}>{window.currentTripOtp || '----'}</div>
                        </div>
                        <button className="confirm-btn" style={{ background: '#EB4D4B' }} onClick={() => window.cancelTrip()}>
                            Cancel Trip
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function LocationSelection({ pickup, drop, onLocationClick }) {
    return (
        <div className="ui-card">
            <div className="location-step" onClick={() => onLocationClick('pickup')}>
                <div className="step-icon">
                    <div className="dot-green"></div>
                    <div className="location-connector"></div>
                </div>
                <div className="step-content">
                    <div className="step-title">
                        {pickup ? (pickup.address.split(',')[0]) : "Current Location"}
                    </div>
                    {/* <div className="step-subtitle">Your current location</div> */}
                </div>
                <div className="step-action">
                    <i className="fas fa-times" style={{ opacity: 0.3 }}></i>
                </div>
            </div>

            <div className="location-step" onClick={() => onLocationClick('drop')}>
                <div className="step-icon">
                    <div className="dot-red"></div>
                </div>
                <div className="step-content">
                    <div className="step-title" style={{ color: drop ? 'black' : '#999' }}>
                        {drop ? (drop.address.split(',')[0]) : "Where to?"}
                    </div>
                </div>
            </div>

            <div className="shortcut-buttons">
                <button className="shortcut-btn">
                    <div className="shortcut-icon"><i className="fas fa-home"></i></div>
                    Home
                </button>
                <button className="shortcut-btn">
                    <div className="shortcut-icon"><i className="fas fa-briefcase"></i></div>
                    Work
                </button>
            </div>
        </div>
    );
}

function RideSelection({ selectedRide, onSelect, estimates, onConfirm, onBack }) {
    return (
        <div className="ui-card">
            <div className="ui-header">
                <h3 className="ui-title">Choose a ride</h3>
                {/* <button onClick={onBack} style={{background:'none', border:'none', cursor:'pointer'}}>
                    <i className="fas fa-times"></i>
                </button> */}
            </div>

            <div className="ride-list">
                {RIDES.map(ride => (
                    <div
                        key={ride.id}
                        className={`ride-option ${selectedRide === ride.id ? 'selected' : ''}`}
                        onClick={() => onSelect(ride.id)}
                    >
                        <div className="ride-icon-container">
                            <i className={`fas ${ride.icon} ride-fa-icon`}></i>
                        </div>
                        <div className="ride-details">
                            <div className="ride-name">
                                {ride.name}
                                <div className="ride-check"><i className="fas fa-check-circle"></i></div>
                            </div>
                            <div className="ride-seats">
                                <i className="fas fa-user"></i> {ride.seats} seat{ride.seats > 1 ? 's' : ''}
                            </div>
                            <div className="ride-eta">{Math.ceil(ride.timeScale * 2)} mins away</div>
                        </div>
                        <div className="ride-price">
                            ₹<span className="price-amount">{estimates[ride.id] || ride.basePrice}</span>
                        </div>
                    </div>
                ))}
            </div>

            <button className="confirm-btn" onClick={onConfirm} disabled={!selectedRide}>
                Confirm Booking <i className="fas fa-arrow-right"></i>
            </button>
        </div>
    );
}

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RideBookingApp />);
