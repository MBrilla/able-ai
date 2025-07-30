import React from 'react';
import styles from './CalendarBubble.module.css'; // Will create this CSS module
import CalendarPickerBubble from './CalendarPickerBubble';


interface CalendarBubbleProps {
    id?: string;
    name?: string;
    label?: string;
    value?: Date | string; // Value could be a Date object or string
    onChange?: (date: Date | null) => void;
    disabled?: boolean;
    // Add other props needed for a date picker component
}

const CalendarBubble: React.FC<CalendarBubbleProps> = ({ id, name, label, value, onChange, disabled }) => {

    // This is a mock implementation. Replace with a real date picker component later.
    return (
        <div className={styles.calendarBubbleWrapper}>
            {label && <label htmlFor={id || name} className={styles.label}>{label}</label>}
            <div className={styles.calendarPlaceholder}>
                {/* <p>[Calendar Picker Placeholder]</p>
                You would integrate a date picker library here */}
                {/* <DatePicker selected={value} onChange={onChange} disabled={disabled} /> */}
                <CalendarPickerBubble 
                    id={id}
                    name={name}
                    label={label}
                    value={value instanceof Date ? value : null} // Ensure value is a Date object or null
                    onChange={onChange ?? (() => {})}
                    disabled={disabled}
                 />
                {value && <p>Selected: {value instanceof Date ? value.toDateString() : String(value)}</p>}
            </div>
        </div>
    );
};

export default CalendarBubble;