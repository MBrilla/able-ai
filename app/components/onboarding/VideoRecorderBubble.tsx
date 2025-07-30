'use client';
import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import styles from "./VideoRecorderBubble.module.css";
import { MonitorPlay } from "lucide-react";

// Add prop type for onVideoRecorded
interface VideoRecorderBubbleProps {
  onVideoRecorded?: (file: Blob) => void;
  prompt?: string;
}

const VideoRecorderBubble: React.FC<VideoRecorderBubbleProps> = ({ onVideoRecorded, prompt }) => {
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImageSrc(imageSrc);
    }
  }, []);

  const resetRecording = () => {
    setVideoURL(null);
    setIsRecording(false);
    setRecordedChunks([]);
    setBlob(null);
    setImageSrc(null);
    setVideoURL(null);
  };

  const handleRecording = () => {
    resetRecording();
    setShowRecorder(true);
  };

  const handleCancelRecording = () => {
    setShowRecorder(false);
  };

  const startRecording = () => {
    resetRecording();
    const stream = webcamRef.current?.stream;
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks(prev => [...prev, event.data]);
      }
    };

    mediaRecorder.start();
    setIsRecording(true);

    setTimeout(() => capture(), 15000);
    setTimeout(() => stopRecording(), 30000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveVideo = async () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    console.log("Video URL:", url);
    if (onVideoRecorded) {
      onVideoRecorded(blob);
    }
  };

  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0) {
      const newBlob = new Blob(recordedChunks, { type: "video/webm" });
      setBlob(newBlob);
      const url = URL.createObjectURL(newBlob);
      setVideoURL(url);
      console.log("Captured image:", imageSrc);
    }
  }, [isRecording, recordedChunks]);

  return (
    <div className={styles.container}>
      {prompt && <div className={styles.prompt}>{prompt}</div>}
      {!showRecorder ? (
        <div className={styles.initial}>
          <button onClick={handleRecording} className={styles.recordButton}>
            <MonitorPlay color="#fff" className={styles.monitorPlay} />
            <span>RECORD VIDEO</span>
          </button>
        </div>
      ) : (
        <>
          {permissionError && (
            <div style={{ color: 'red', marginTop: 12 }}>{permissionError}</div>
          )}
          {!videoURL ? (
            <div className={styles.recorder}>
              <Webcam
                ref={webcamRef}
                audio={true}
                mirrored={true}
                screenshotFormat="image/jpeg"
                videoConstraints={true}
                className={styles.webcam}
                onUserMedia={() => {
                  setPermissionError(null);
                  console.log("Webcam stream started");
                }}
                onUserMediaError={err => {
                  setPermissionError("Camera access denied or not available. Please allow camera access and refresh the page.");
                  console.error("Webcam error", err);
                }}
              />
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={styles.controlButton}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </button>
              <button onClick={handleCancelRecording} className={styles.recordButton}>
                Cancel Recording
              </button>
              <p className={styles.note}>Max duration: 30 seconds</p>
            </div>
          ) : (
            <div className={styles.preview}>
              <video controls src={videoURL} className={styles.video} />
              <div className={styles.actions}>
                <button onClick={saveVideo} className={styles.saveButton}>
                  Save Video
                </button>
                <button
                  onClick={() => {
                    setVideoURL(null);
                    setRecordedChunks([]);
                    setBlob(null);
                  }}
                  className={styles.rerecordButton}
                >
                  Re-record
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VideoRecorderBubble;
