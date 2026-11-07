import { useEffect, useRef, useState } from "react";
import cameraImg from "./assets/camera.png";

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
    // Example mapping filters to images in public/filter/
    const filterStyles = {
        none: { label: "Normal", css: "none", canvas: "none", img: "./filter/f1.png" },
        bw: { label: "B&W Mono", css: "grayscale(100%)", canvas: "grayscale(100%)", img: "./filter/f2.png" },
        sepia: { label: "Vintage Sepia", css: "sepia(90%)", canvas: "sepia(90%)", img: "./filter/f3.png" },
        retro: { label: "Warm Retro", css: "contrast(120%) sepia(35%)", canvas: "contrast(120%) sepia(35%)", img: "./filter/f4.png" },
        cool: { label: "Cool Blue", css: "hue-rotate(180%)", canvas: "hue-rotate(180%)", img: "./filter/f5.png" },
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

    // CREATE VERTICAL STRIP WITH SELECTED DEPARTMENT THEME
    const createStrip = async (images) => {
        if (!images || images.length === 0) return null;

        const photoDim = 600; // Square size per shot
        const padding = 40;   // Outer strip padding
        const gap = 24;       // Vertical spacing between shots
        const footerHeight = 140; // Bottom branding area

        const canvasWidth = photoDim + padding * 2;
        const canvasHeight = padding * 2 + images.length * photoDim + (images.length - 1) * gap + footerHeight;

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        // 🎨 BASE BACKGROUND COLOR (Customizable per department theme)
        const themeBgColors = {
            bsit: "#faf7f2", // Dark Tech
            cte: "#faf7f2",  // Deep Royal Blue
            cbam: "#faf7f2", // Emerald Green
            bsoa: "#faf7f2", // Deep Magenta/Pink
        };

        ctx.fillStyle = themeBgColors[frame] || "#faf7f2";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 🖼️ DRAW EACH PHOTO & OVERLAY THE MATCHING FRAME
        for (let i = 0; i < images.length; i++) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = images[i];
            await new Promise((resolve) => (img.onload = resolve));

            const x = padding;
            const y = padding + i * (photoDim + gap);

            // 1. Draw photo content
            ctx.drawImage(img, x, y, photoDim, photoDim);

            // 2. Determine frame path (e.g. /frames/bsit/1.png ... /frames/bsit/4.png)
            const framePath = `/frames/${frame}/${i + 1}.png`;

            try {
                const frameImg = new Image();
                frameImg.src = framePath;
                await new Promise((res, rej) => {
                    frameImg.onload = res;
                    frameImg.onerror = rej;
                });
                ctx.drawImage(frameImg, x, y, photoDim, photoDim);
            } catch (e) {
                console.error(`Frame asset missing: ${framePath}`);
            }
        }

        // 📝 FOOTER BRANDING
        ctx.fillStyle = "#09090b";
        ctx.textAlign = "center";
        ctx.font = "bold 32px monospace";
        ctx.fillText(`${frame.toUpperCase()} | SNAPBOOTH`, canvasWidth / 2, canvasHeight - 75);

        ctx.font = "500 18px monospace";
        ctx.fillStyle = "rgba(31, 29, 29, 0.7)";
        ctx.fillText(
            new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            canvasWidth / 2,
            canvasHeight - 40
        );

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
            <header style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                marginBottom: "20px",
                width: "100%",
                padding: "0 10px"
            }}>
                <img
                    src={cameraImg}
                    alt="SnapBooth Logo"
                    style={{
                        height: "180px",// Optional: makes it a nice circle logo
                        marginBottom: "12px"
                    }}
                />
                <h1
                    style={{
                        fontSize: "clamp(2rem, 5vw, 2.8rem)",
                        fontWeight: "900",
                        letterSpacing: "-1px",
                        margin: "0 0 8px 0",
                        paddingBottom: "4px",
                        lineHeight: "1.2",
                        background: "linear-gradient(135deg, #a855f7, #6366f1)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        display: "inline-block",
                    }}
                >
                    SnapBooth
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
                        display: "hidden",
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
                                background: "#059669",
                                color: "#fff",
                                border: "none",
                                fontWeight: "bold",
                                cursor: "pointer",
                            }}
                        >
                            Install SnapBooth App
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
                                        padding: "10px 14px",
                                        borderRadius: "10px",
                                        border: filter === f ? "2px solid #818cf8" : "1px solid rgba(255,255,255,0.1)",
                                        background: filter === f ? "rgba(99, 102, 241, 0.2)" : "#18181b",
                                        color: filter === f ? "#a5b4fc" : "#a1a1aa",
                                        fontSize: "0.85rem",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                    }}
                                >
                                    {/* Full Circle Image Preview Icon */}
                                    <img
                                        src={filterStyles[f].img}
                                        alt={f}
                                        style={{
                                            width: "40px",
                                            height: "40px",
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                            border: "none",
                                            display: "block",
                                        }}
                                    />
                                    <span>{filterStyles[f].label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FRAME SELECTION */}
                    {/* THEME / FRAME SELECTION */}
                    <div>
                        <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", fontSize: "0.9rem", color: "#d4d4d8" }}>
                            2. Select Course/Department Theme
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                            {[
                                { id: "bsit", label: "BSIT Theme", preview: "/frames/bsit/1.png" },
                                { id: "cte", label: "CTE Theme", preview: "/frames/cte/1.png" },
                                { id: "cbam", label: "CBAM Theme", preview: "/frames/cbam/1.png" },
                                { id: "bsoa", label: "BSOA Theme", preview: "/frames/bsoa/1.png" },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setFrame(item.id)}
                                    style={{
                                        padding: "12px 14px",
                                        borderRadius: "12px",
                                        border: frame === item.id ? "2px solid #818cf8" : "1px solid rgba(255,255,255,0.1)",
                                        background: frame === item.id ? "rgba(99, 102, 241, 0.2)" : "#18181b",
                                        color: frame === item.id ? "#a5b4fc" : "#a1a1aa",
                                        fontSize: "0.85rem",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                    }}
                                >
                                    <img
                                        src={item.preview}
                                        alt={item.label}
                                        style={{
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                            border: "none",
                                            display: "block",
                                        }}
                                    />
                                    <span>{item.label}</span>
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
                            fontWeight: "700",
                            background: "#a855f7",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            transition: "transform 0.2s ease",
                        }}
                    >
                        Enter Photo Booth
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
                            Retake
                        </button>

                        <button
                            onClick={downloadStrip}
                            style={{
                                flex: 2,
                                padding: "14px",
                                borderRadius: "14px",
                                background: "#a855f7",
                                border: "none",
                                color: "#fff",
                                fontWeight: "600",
                                cursor: "pointer",
                            }}
                        >
                            <img src="" alt="" /> Save Photo Strip
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}