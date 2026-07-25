// Live Cyberpunk Background - Binary Code Rain
(function () {
    const canvas = document.createElement('canvas');
    canvas.id = 'cyber-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);

    const style = document.createElement('style');
    style.innerHTML = `
        #cyber-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -2;
            pointer-events: none;
            opacity: 0.14; /* Subtle opacity to ensure dashboard readability */
        }
    `;
    document.head.appendChild(style);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Handle viewport resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initializeDrops();
        }, 100);
    });

    const alphabet = "01";
    const fontSize = 14;
    let columns = Math.floor(width / fontSize);
    let drops = [];

    function initializeDrops() {
        columns = Math.floor(width / fontSize);
        drops = [];
        for (let x = 0; x < columns; x++) {
            drops[x] = Math.random() * -100; // Random starting offsets
        }
    }

    initializeDrops();

    function draw() {
        // Draw trailing translucent black fill to create fade trace
        ctx.fillStyle = 'rgba(3, 7, 18, 0.08)';
        ctx.fillRect(0, 0, width, height);

        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            
            // Alternating cyan and purple colours matching the Tech Manthan design system
            ctx.fillStyle = (i % 2 === 0) ? '#00f3ff' : '#bc13fe';
            
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            // Reset drop to top randomly once it leaves the viewport
            if (drops[i] * fontSize > height && Math.random() > 0.975) {
                drops[i] = 0;
            }

            drops[i]++;
        }
    }

    // Run code rain at ~30 FPS
    setInterval(draw, 33);

    // Connection Status Monitor Logic
    const connStyle = document.createElement('style');
    connStyle.innerHTML = `
        .cyber-conn-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.85rem;
            font-weight: bold;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
            transform: translateY(100px);
            opacity: 0;
        }
        .cyber-conn-toast.visible {
            transform: translateY(0);
            opacity: 1;
        }
        .cyber-conn-toast.offline {
            background: rgba(20, 10, 10, 0.95);
            border: 1.5px solid #ff2a5f;
            color: #ff2a5f;
            box-shadow: 0 0 20px rgba(255, 42, 95, 0.35);
        }
        .cyber-conn-toast.online {
            background: rgba(10, 20, 15, 0.95);
            border: 1.5px solid #39ff14;
            color: #39ff14;
            box-shadow: 0 0 20px rgba(57, 255, 20, 0.35);
        }
    `;
    document.head.appendChild(connStyle);

    const toast = document.createElement('div');
    toast.className = 'cyber-conn-toast';
    document.body.appendChild(toast);

    let fadeTimeout;

    function showStatusNotification(isOnline) {
        clearTimeout(fadeTimeout);
        toast.classList.remove('offline', 'online', 'visible');
        
        if (isOnline) {
            toast.classList.add('online');
            toast.innerHTML = `<span>⚡</span> SERVER CONNECTED (ONLINE)`;
            toast.classList.add('visible');
            
            fadeTimeout = setTimeout(() => {
                toast.classList.remove('visible');
            }, 4000);
        } else {
            toast.classList.add('offline');
            toast.innerHTML = `<span>⚠️</span> CLIENT OFFLINE (CACHED PERSISTENCE)`;
            toast.classList.add('visible');
        }
    }

    window.addEventListener('online', () => showStatusNotification(true));
    window.addEventListener('offline', () => showStatusNotification(false));

    if (!navigator.onLine) {
        setTimeout(() => showStatusNotification(false), 1500);
    }
})();
