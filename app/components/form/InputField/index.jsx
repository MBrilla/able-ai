import React from 'react';
import styles from './InputField.module.css';

const InputField = ({ id, name, placeholder, type = "text", value, onChange, required = false, ...props }) => {
  return (
    <input
      id={id}
      name={name}
      className={styles.input}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      {...props}
    />
  );
};
export default InputField;