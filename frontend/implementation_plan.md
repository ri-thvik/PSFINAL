# Implementation Plan - Modern Ride Booking UI

# Goal Description
Update the frontend UI to match the provided screenshots (Right-side floating panel, modern styling) and implement "Ride Selection" logic using React State/Context, as requested. The solution will integrate React into the existing Vanilla JS application without breaking existing backend/map logic.

## User Review Required
> [!IMPORTANT]
> **Architecture Decision**: To satisfy the requirement of "Use React state/context" without rewriting the stable 1200+ line `rider.js` (which handles complex Auth/Socket logic) or introducing a complex build step (Webpack) to a plain HTML project, I will use **React & Babel Standalone via CDN**.
>
> This allows us to write JSX components for the new UI while keeping the existing backend integration intact.

## Proposed Changes

### Frontend Core

#### [MODIFY] [index.html](file:///k:/ALL%20UPDATES/PSFINAL/frontend/index.html)
- Add CDN links for React 18, ReactDOM 18, and Babel Standalone.
- Add a new mounting point `<div id="root"></div>` for the React application.
- Hide existing "Bottom Sheet" UI elements (`#location-sheet`, `#vehicle-sheet`) as they are being replaced.
- Load the new React entry script with `type="text/babel"`.

#### [NEW] [js/components.jsx](file:///k:/ALL%20UPDATES/PSFINAL/frontend/js/components.jsx)
- **RideBookingContext**: Manages state for:
    - Current View (`LOCATION_SELECT`, `RIDE_SELECT`, `SEARCHING`, `ON_TRIP`)
    - Locations (Pickup/Drop)
    - Selected Ride Type
- **Components**:
    - `FloatingPanel`: The main container on the right.
    - `LocationSelector`: Top half of the screenshot (Green/Red dots).
    - `RideSelector`: List of rides (Bike, Auto, Car) with pricing and selection logic.
    - `ConfirmButton`: Triggers the booking.

#### [NEW] [css/modern-ui.css](file:///k:/ALL%20UPDATES/PSFINAL/frontend/css/modern-ui.css)
- CSS Variables for the new theme (Shadows, Colors, Border Radius).
- Styles for the floating card layout (Fixed position right, responsive).
- Animation classes for view transitions.

### Integration Layer

#### [MODIFY] [js/rider.js](file:///k:/ALL%20UPDATES/PSFINAL/frontend/js/rider.js)
- Update `checkIfReadyToShowVehicles` to dispatch an event to React instead of opening the old sheet.
- Expose necessary data (User info, Current Location) to the React logic via `window` or CustomEvents.
- Modify `confirmBooking` to be callable from the React component with the selected parameters.

## Verification Plan

### Manual Verification
1.  **Load App**: Open `http://localhost:3000`.
2.  **Visual Check**:
    - Confirm Map is full screen.
    - Confirm new "Right Side Panel" is visible (initially showing Location Selection).
    - Confirm old Bottom Sheets are GONE.
3.  **Functional Flow**:
    - Select a location (simulated or real).
    - Verify view switches to "Ride Selection".
    - Click "Bike", "Auto", "Car" -> Verify selection styling (Border/Checkmark).
    - Click "Confirm Booking".
    - Check Console for "Booking Confirmed" logs or actual Socket emission.
4.  **Browser Tool**:
    - Capture screenshot of the final UI to compare with requirements.
