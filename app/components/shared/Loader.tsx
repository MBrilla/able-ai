import styles from './Loader.module.css'; // Adjust the path as necessary

const Loader = () => {
  return (
    <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
    </div>
  )
}
export default Loader
