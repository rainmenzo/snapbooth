import { useEffect, useRef, useState } from "react";

export default function Camera() {
    const videoRef = useRef(null);

    const [photos, setPhotos] = useState([]);
    const [count, setCount] = useState(null);
    const [strip, setStrip] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isFlashActive, setIsFlashActive] = useState(false);

    const [filter, setFilter] = useState("none");
    const [frame, setFrame] = useState("none");
    const [mode, setMode] = useState("setup"); // 'setup' | 'camera' | 'result'
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    // 🎭 FILTER STYLES (CSS & Canvas compatible)
    const filterStyles = {
        none: { label: "Normal", css: "none", canvas: "none" },
        bw: { label: "B&W Mono", css: "grayscale(100%) contrast(110%)", canvas: "grayscale(100%) contrast(110%)" },
        sepia: { label: "Vintage Sepia", css: "sepia(90%) contrast(105%) brightness(95%)", canvas: "sepia(90%) contrast(105%) brightness(95%)" },
        retro: { label: "Warm Retro", css: "contrast(120%) sepia(35%) saturate(140%)", canvas: "contrast(120%) sepia(35%) saturate(140%)" },
        cool: { label: "Cool Blue", css: "hue-rotate(180%) contrast(105%) saturate(120%)", canvas: "hue-rotate(180%) contrast(105%) saturate(120%)" },
    };

    // PWA Install Handler
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
            console.log("App installed");
        }
        setDeferredPrompt(null);
    };

    // CAMERA STREAM SETUP
    useEffect(() => {
        let streamInstance = null;
        if (mode === "camera") {
            navigator.mediaDevices
                .getUserMedia({
                    video: {
                        width: { ideal: 1080 },
                        height: { ideal: 1080 },
                        facingMode: "user",
                    },
                    audio: false,
                })
                .then((stream) => {
                    streamInstance = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch((err) => console.error("Camera access error:", err));
        }

        return () => {
            if (streamInstance) {
                streamInstance.getTracks().forEach((track) => track.stop());
            }
        };
    }, [mode]);

    // TAKE PHOTO (Strict Square Aspect Ratio Crop)
    const takePhoto = () => {
        if (!videoRef.current) return null;
        const video = videoRef.current;

        // Determine square dimensions from video source
        const minDim = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - minDim) / 2;
        const startY = (video.videoHeight - minDim) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 600;

        const ctx = canvas.getContext("2d");
        ctx.filter = filterStyles[filter].canvas;

        // Draw square cropped image (Center Crop)
        ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 600, 600);

        // Flash animation trigger
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 250);

        return canvas.toDataURL("image/png");
    };

    // COUNTDOWN TIMERS
    const countdown = (seconds) => {
        return new Promise((resolve) => {
            let c = seconds;
            setCount(c);

            const interval = setInterval(() => {
                c--;
                if (c > 0) {
                    setCount(c);
                } else if (c === 0) {
                    setCount("SMILE! 📸");
                } else {
                    clearInterval(interval);
                    setCount(null);
                    resolve();
                }
            }, 1000);
        });
    };

    // CREATE VERTICAL STRIP WITH CUSTOM FRAME OVERLAY
    const createStrip = async (images) => {
        if (!images || images.length === 0) return null;

        const photoDim = 600; // Square width/height per shot
        const padding = 30; // Border space around strip
        const gap = 20; // Vertical gap between photos
        const footerHeight = 120; // Space at bottom for photobooth branding/drawn frame text

        const canvasWidth = photoDim + padding * 2;
        const canvasHeight = padding * 2 + images.length * photoDim + (images.length - 1) * gap + footerHeight;

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        // 🎨 STRIP BASE BACKGROUND
        ctx.fillStyle = frame === "dark" ? "#121215" : frame === "korean" ? "#ffffff" : "#faf7f2";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 🖼️ DRAW EACH PHOTO
        for (let i = 0; i < images.length; i++) {
            const img = new Image();
            img.src = images[i];
            await new Promise((resolve) => (img.onload = resolve));

            const x = padding;
            const y = padding + i * (photoDim + gap);

            // Draw photo
            ctx.drawImage(img, x, y, photoDim, photoDim);

            // FRAME OVERLAY STYLES
            if (frame === "korean") {
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 14;
                ctx.strokeRect(x, y, photoDim, photoDim);
            } else if (frame === "custom") {
                // -------------------------------------------------------------
                // ✏️ PLACEHOLDER FOR YOUR CUSTOM DRAWN FRAME OVERLAY:
                // Size of canvas area per photo: 600px x 600px
                // You can load your custom PNG frame overlay here:
                //
                // const overlayImg = new Image();
                // overlayImg.src = "/frames/my-custom-drawn-frame.png";
                // await new Promise(res => overlayImg.onload = res);
                // ctx.drawImage(overlayImg, x, y, photoDim, photoDim);
                // -------------------------------------------------------------
                ctx.strokeStyle = "#ff007a";
                ctx.lineWidth = 12;
                ctx.strokeRect(x, y, photoDim, photoDim);

                ctx.fillStyle = "#ff007a";
                ctx.font = "bold 24px sans-serif";
                ctx.fillText("✨ SnapBooth Edition", x + 20, y + photoDim - 20);
            }
        }

        // FOOTER BRANDING / LOGO
        ctx.fillStyle = frame === "dark" ? "#ffffff" : "#111111";
        ctx.textAlign = "center";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText("SNAPBOOTH", canvasWidth / 2, canvasHeight - 60);

        ctx.font = "500 18px sans-serif";
        ctx.fillStyle = frame === "dark" ? "#888888" : "#666666";
        ctx.fillText(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), canvasWidth / 2, canvasHeight - 30);

        return canvas.toDataURL("image/png");
    };

    // START BOOTH SESSION
    const startBooth = async () => {
        setIsRunning(true);
        setPhotos([]);
        const shots = [];

        for (let i = 0; i < 4; i++) {
            await countdown(3);
            const shot = takePhoto();
            if (shot) shots.push(shot);
        }

        setPhotos(shots);
        const finalStrip = await createStrip(shots);
        setStrip(finalStrip);
        setIsRunning(false);
        setMode("result");
    };

    // DOWNLOAD STRIP
    const downloadStrip = () => {
        if (!strip) return alert("No photo strip available yet!");
        const link = document.createElement("a");
        link.href = strip;
        link.download = `snapbooth-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #09090b 80%)",
                color: "#fff",
                fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                boxSizing: "border-box",
            }}
        >
            {/* HEADER BRANDING */}
            <header style={{ textAlign: "center", marginBottom: "20px", width: "100%", padding: "0 10px" }}>
                <h1
                    style={{
                        fontSize: "clamp(2rem, 5vw, 2.8rem)",
                        fontWeight: "900",
                        letterSpacing: "-1px",
                        margin: "0 0 8px 0",
                        paddingBottom: "4px", // Prevents bottom clipping on descenders or gradients
                        lineHeight: "1.2",
                        background: "linear-gradient(135deg, #a855f7, #6366f1)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        display: "inline-block",
                    }}
                >
                    📸 SnapBooth
                </h1>
                <p style={{ color: "#a1a1aa", margin: 0, fontSize: "0.95rem" }}>Classic 4-Cut Studio Experience</p>
            </header>

            {/* ======================= SETUP SCREEN ======================= */}
            {mode === "setup" && (
                <div
                    style={{
                        width: "100%",
                        maxWidth: "480px",
                        background: "rgba(24, 24, 27, 0.75)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "24px",
                        padding: "32px",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "24px",
                    }}
                >
                    {deferredPrompt && (
                        <button
                            onClick={installApp}
                            style={{
                                padding: "12px 20px",
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                color: "#fff",
                                border: "none",
                                fontWeight: "bold",
                                cursor: "pointer",
                                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                            }}
                        >
                            📲 Install SnapBooth App
                        </button>
                    )}

                    {/* FILTER SELECTION */}
                    <div>
                        <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", fontSize: "0.9rem", color: "#d4d4d8" }}>
                            1. Choose Filter Preset
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                            {Object.keys(filterStyles).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        padding: "10px 8px",
                                        borderRadius: "10px",
                                        border: filter === f ? "2px solid #818cf8" : "1px solid rgba(255,255,255,0.1)",
                                        background: filter === f ? "rgba(99, 102, 241, 0.2)" : "#18181b",
                                        color: filter === f ? "#a5b4fc" : "#a1a1aa",
                                        fontSize: "0.85rem",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {filterStyles[f].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FRAME SELECTION */}
                    <div>
                        <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", fontSize: "0.9rem", color: "#d4d4d8" }}>
                            2. Select Strip Frame Style
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                            {[
                                { id: "none", label: "Classic White" },
                                { id: "korean", label: "K-Booth Border" },
                                { id: "custom", label: "Drawn Frame" },
                                { id: "dark", label: "Minimal Dark" },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setFrame(item.id)}
                                    style={{
                                        padding: "10px 8px",
                                        borderRadius: "10px",
                                        border: frame === item.id ? "2px solid #818cf8" : "1px solid rgba(255,255,255,0.1)",
                                        background: frame === item.id ? "rgba(99, 102, 241, 0.2)" : "#18181b",
                                        color: frame === item.id ? "#a5b4fc" : "#a1a1aa",
                                        fontSize: "0.85rem",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ENTER CAMERA BUTTON */}
                    <button
                        onClick={() => setMode("camera")}
                        style={{
                            marginTop: "8px",
                            padding: "16px",
                            borderRadius: "16px",
                            fontSize: "1.1rem",
                            fontWeight: "800",
                            background: "linear-gradient(135deg, #6366f1, #a855f7)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.5)",
                            transition: "transform 0.2s ease",
                        }}
                    >
                        Enter Photo Booth 🚀
                    </button>
                </div>
            )}

            {/* ======================= CAMERA VIEW SCREEN ======================= */}
            {mode === "camera" && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "100%",
                        maxWidth: "420px",
                    }}
                >
                    {/* CAMERA CONTAINER (Strict 1:1 Square Viewport) */}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            aspectRatio: "1/1",
                            borderRadius: "24px",
                            overflow: "hidden",
                            border: "4px solid rgba(255, 255, 255, 0.15)",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
                            background: "#000",
                        }}
                    >
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                transform: "scaleX(-1)", // Mirror camera feed for authentic feel
                                filter: filterStyles[filter].css,
                            }}
                        />

                        {/* CAMERA FLASH EFFECT */}
                        {isFlashActive && (
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "#fff",
                                    zIndex: 20,
                                    opacity: 0.9,
                                }}
                            />
                        )}

                        {/* COUNTDOWN OVERLAY */}
                        {count !== null && (
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    fontSize: typeof count === "number" ? "6rem" : "2.5rem",
                                    fontWeight: "900",
                                    color: "#fff",
                                    background: "rgba(0,0,0,0.4)",
                                    backdropFilter: "blur(4px)",
                                    zIndex: 10,
                                }}
                            >
                                {count}
                            </div>
                        )}
                    </div>

                    {/* CONTROLS BAR */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            marginTop: "24px",
                        }}
                    >
                        <button
                            onClick={() => setMode("setup")}
                            disabled={isRunning}
                            style={{
                                padding: "12px 20px",
                                borderRadius: "14px",
                                background: "rgba(24, 24, 27, 0.8)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#a1a1aa",
                                fontWeight: "600",
                                cursor: isRunning ? "not-allowed" : "pointer",
                            }}
                        >
                            ⚙️ Settings
                        </button>

                        {/* SHUTTER BUTTON */}
                        <button
                            onClick={startBooth}
                            disabled={isRunning}
                            style={{
                                width: "72px",
                                height: "72px",
                                borderRadius: "50%",
                                border: "4px solid #ffffff",
                                background: isRunning ? "#52525b" : "radial-gradient(circle, #ef4444 0%, #dc2626 100%)",
                                boxShadow: isRunning ? "none" : "0 0 20px rgba(239, 68, 68, 0.6)",
                                cursor: isRunning ? "not-allowed" : "pointer",
                                transition: "transform 0.1s active",
                            }}
                        />

                        <div style={{ width: "80px" }} />
                    </div>
                </div>
            )}

            {/* ======================= RESULT SCREEN ======================= */}
            {mode === "result" && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "20px",
                        maxWidth: "400px",
                        width: "100%",
                    }}
                >
                    {strip && (
                        <div
                            style={{
                                background: "rgba(24, 24, 27, 0.8)",
                                padding: "16px",
                                borderRadius: "20px",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                            }}
                        >
                            <img
                                src={strip}
                                alt="Photo strip preview"
                                style={{
                                    width: "180px",
                                    borderRadius: "8px",
                                    display: "block",
                                }}
                            />
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                        <button
                            onClick={() => setMode("camera")}
                            style={{
                                flex: 1,
                                padding: "14px",
                                borderRadius: "14px",
                                background: "#27272a",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#fff",
                                fontWeight: "600",
                                cursor: "pointer",
                            }}
                        >
                            🔄 Retake
                        </button>

                        <button
                            onClick={downloadStrip}
                            style={{
                                flex: 2,
                                padding: "14px",
                                borderRadius: "14px",
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                border: "none",
                                color: "#fff",
                                fontWeight: "700",
                                cursor: "pointer",
                                boxShadow: "0 10px 20px -5px rgba(16, 185, 129, 0.4)",
                            }}
                        >
                            💾 Save Photo Strip
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}