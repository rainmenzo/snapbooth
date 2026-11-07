import { useEffect, useRef, useState } from "react";

export default function Camera() {
    const videoRef = useRef(null);

    const [photos, setPhotos] = useState([]);
    const [count, setCount] = useState(null);
    const [strip, setStrip] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    const [filter, setFilter] = useState("none");
    const [frame, setFrame] = useState("none");
    const [mode, setMode] = useState("setup"); // 👈 NEW

    const [deferredPrompt, setDeferredPrompt] = useState(null);

    // 🎭 FILTER STYLES
    const filterStyles = {
        none: "none",
        bw: "grayscale(100%)",
        sepia: "sepia(100%)",
        vintage: "contrast(120%) sepia(40%)",
    };

    // PWA Install Prompt
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === 'accepted') {
            console.log('App installed');
        }

        setDeferredPrompt(null);
    };

    // CAMERA STREAM
    useEffect(() => {
        if (mode === "camera") {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    videoRef.current.srcObject = stream;
                })
                .catch(err => console.error(err));
        }
    }, [mode]);

    // TAKE PHOTO
    const takePhoto = () => {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.filter = filterStyles[filter];
        ctx.drawImage(videoRef.current, 0, 0);

        return canvas.toDataURL("image/png");
    };

    // COUNTDOWN
    const countdown = (seconds) => {
        return new Promise(resolve => {
            let c = seconds;
            setCount(c);

            const interval = setInterval(() => {
                c--;
                setCount(c);

                if (c < 0) {
                    clearInterval(interval);
                    setCount(null);
                    resolve();
                }
            }, 1000);
        });
    };

    // CREATE STRIP
    const createStrip = async (images) => {
        if (!images || images.length === 0) return null;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const width = 300;
        const height = 300;

        canvas.width = width;
        canvas.height = height * images.length;

        for (let i = 0; i < images.length; i++) {
            const img = new Image();
            img.src = images[i];
            await new Promise(resolve => (img.onload = resolve));

            ctx.drawImage(img, 0, i * height, width, height);

            // FRAME
            if (frame === "korean") {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 10;
                ctx.strokeRect(0, i * height, width, height);
            }
        }

        return canvas.toDataURL("image/png");
    };

    // START PHOTOBOOTH FLOW
    const startBooth = async () => {
        setIsRunning(true);
        const shots = [];

        for (let i = 0; i < 4; i++) {
            await countdown(3);
            shots.push(takePhoto());
        }

        setPhotos(shots);

        const finalStrip = await createStrip(shots);
        setStrip(finalStrip);

        setIsRunning(false);
    };

    // DOWNLOAD STRIP
    const downloadStrip = () => {
        if (!strip) return alert("No strip to download yet!");

        const link = document.createElement("a");
        link.href = strip;
        link.download = "snapbooth.png";
        link.target = "_blank"; // ensures safe click in some browsers
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ======================
    // SETUP SCREEN
    // ======================
    if (mode === "setup") {
        return (
            <div style={{
                height: "100vh",
                background: "#000",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <h1>📸 SnapBooth</h1>

                {deferredPrompt && (
                    <button
                        onClick={installApp}
                        style={{
                            marginTop: "15px",
                            padding: "10px 20px",
                            background: "#00c853",
                            color: "#fff",
                            border: "none"
                        }}
                    >
                        Install App
                    </button>
                )}

                {/* FILTERS */}
                <h3>Select Filter</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                    {Object.keys(filterStyles).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: "10px",
                                border: filter === f ? "2px solid yellow" : "1px solid white",
                                background: "#111",
                                color: "#fff"
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* FRAMES */}
                <h3 style={{ marginTop: "20px" }}>Select Frame</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setFrame("none")}>None</button>
                    <button onClick={() => setFrame("korean")}>K-Frame</button>
                </div>

                {/* START */}
                <button
                    onClick={() => setMode("camera")}
                    style={{
                        marginTop: "30px",
                        padding: "15px 30px",
                        fontSize: "18px",
                        background: "red",
                        color: "#fff",
                        border: "none"
                    }}
                >
                    Start Photobooth
                </button>
            </div>
        );
    }

    // ======================
    // CAMERA SCREEN
    // ======================
    return (
        <div style={{ height: "100vh", background: "#000" }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: filterStyles[filter]
                }}
            />

            {/* COUNTDOWN */}
            {count !== null && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "100px",
                    color: "#fff",
                    background: "rgba(0,0,0,0.5)"
                }}>
                    {count}
                </div>
            )}

            {/* TAKE PHOTO BUTTON */}
            {!isRunning && (
                <button
                    onClick={startBooth}
                    style={{
                        position: "absolute",
                        bottom: "30px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        border: "5px solid white",
                        background: "red"
                    }}
                />
            )}

            {/* PHOTO STRIP RESULT */}
            {strip && (
                <div style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "#111",
                    padding: 10
                }}>
                    <img src={strip} width="120" alt="Photo strip" />
                    <br />
                    <button onClick={downloadStrip}>Download</button>
                </div>
            )}
        </div>
    );
}
