// Live Cyberpunk Background - Binary Code Rain
(function () {
    // Disable falling binary code rain animation specifically on admin portal
    if (window.location.pathname.toLowerCase().includes('admin')) {
        return;
    }

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
            z-index: 1;
            pointer-events: none;
            opacity: 0.9;
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
    const fontSize = 11;
    const colSpacing = 14;
    let columns = Math.floor(width / colSpacing);
    let drops = [];
    let speeds = [];

    function initializeDrops() {
        columns = Math.floor(width / colSpacing);
        drops = [];
        speeds = [];
        const maxRows = Math.floor(height / fontSize);
        for (let x = 0; x < columns; x++) {
            // Distribute starting drops across screen with staggered offsets
            drops[x] = Math.floor(Math.random() * (maxRows + 30)) - 30;
            // Variable speed creates realistic distant depth perspective
            speeds[x] = 0.4 + Math.random() * 0.7;
        }
    }

    initializeDrops();

    function draw() {
        // Soft translucent clear to create elegant trailing trace
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.055)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';

        ctx.font = '11px "Courier New", "Fira Code", monospace';
        ctx.shadowBlur = 0;

        for (let i = 0; i < columns; i++) {
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            const x = i * colSpacing;
            const y = Math.floor(drops[i]) * fontSize;
            
            // Faint, translucent cyan/blue & subtle magenta tint for distant minimal look
            const isHead = Math.random() > 0.88;
            const isPurple = (i % 6 === 0);

            if (isHead) {
                ctx.fillStyle = 'rgba(0, 243, 255, 0.7)';
            } else if (isPurple) {
                ctx.fillStyle = 'rgba(188, 19, 254, 0.3)';
            } else {
                ctx.fillStyle = 'rgba(0, 210, 255, 0.3)';
            }
            
            ctx.fillText(text, x, y);

            // Reset drop to top once it leaves the viewport
            if (y > height && Math.random() > 0.975) {
                drops[i] = -Math.floor(Math.random() * 15);
            }

            drops[i] += speeds[i] || 0.6;
        }
    }

    // Run code rain at smooth 30 FPS
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

    // Custom Cyber Modal Dialogs
    const dialogStyle = document.createElement('style');
    dialogStyle.innerHTML = `
        .cyber-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(5, 2, 10, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
        }
        .cyber-modal-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }
        .cyber-modal-card {
            background: rgba(13, 8, 22, 0.95);
            border: 2px solid #00f0ff;
            box-shadow: 0 0 25px rgba(0, 240, 255, 0.25), inset 0 0 15px rgba(0, 240, 255, 0.1);
            width: 90%;
            max-width: 450px;
            padding: 24px;
            border-radius: 12px;
            font-family: 'Orbitron', sans-serif;
            color: #ffffff;
            transform: scale(0.8);
            transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
        }
        .cyber-modal-overlay.active .cyber-modal-card {
            transform: scale(1);
        }
        .cyber-modal-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, #00f0ff, #ff007f);
        }
        .cyber-modal-title {
            font-size: 1.1rem;
            font-weight: 900;
            letter-spacing: 1px;
            color: #00f0ff;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
        }
        .cyber-modal-title.warning {
            color: #ff007f;
            text-shadow: 0 0 10px rgba(255, 0, 127, 0.5);
        }
        .cyber-modal-body {
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            line-height: 1.5;
            color: #e2e8f0;
            margin-bottom: 24px;
            word-break: break-word;
            white-space: pre-wrap;
        }
        .cyber-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }
        .cyber-modal-btn {
            background: transparent;
            border: 1px solid #00f0ff;
            color: #00f0ff;
            padding: 8px 20px;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.8rem;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-shadow: 0 0 5px rgba(0, 240, 255, 0.3);
        }
        .cyber-modal-btn:hover {
            background: rgba(0, 240, 255, 0.15);
            box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
        }
        .cyber-modal-btn.primary {
            background: #00f0ff;
            color: #0d0816;
            text-shadow: none;
        }
        .cyber-modal-btn.primary:hover {
            background: #ffffff;
            border-color: #ffffff;
            color: #0d0816;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
        }
        .cyber-modal-btn.danger {
            border-color: #ff007f;
            color: #ff007f;
            text-shadow: 0 0 5px rgba(255, 0, 127, 0.3);
        }
        .cyber-modal-btn.danger:hover {
            background: rgba(255, 0, 127, 0.15);
            box-shadow: 0 0 15px rgba(255, 0, 127, 0.4);
        }
    `;
    document.head.appendChild(dialogStyle);

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'cyber-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="cyber-modal-card">
            <div class="cyber-modal-title" id="cyberModalTitle">⚡ SYSTEM ALERT</div>
            <div class="cyber-modal-body" id="cyberModalBody"></div>
            <div class="cyber-modal-actions" id="cyberModalActions"></div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    const cyberModalTitle = document.getElementById('cyberModalTitle');
    const cyberModalBody = document.getElementById('cyberModalBody');
    const cyberModalActions = document.getElementById('cyberModalActions');

    window.alert = function(message) {
        return new Promise((resolve) => {
            cyberModalTitle.innerText = "⚡ SYSTEM ALERT";
            cyberModalTitle.className = "cyber-modal-title";
            cyberModalBody.innerText = message;
            
            cyberModalActions.innerHTML = '';
            const okBtn = document.createElement('button');
            okBtn.className = 'cyber-modal-btn primary';
            okBtn.innerText = 'ACKNOWLEDGE';
            okBtn.onclick = () => {
                modalOverlay.classList.remove('active');
                resolve();
            };
            cyberModalActions.appendChild(okBtn);
            
            modalOverlay.classList.add('active');
            setTimeout(() => okBtn.focus(), 50);
        });
    };

    window.confirm = function(message) {
        return new Promise((resolve) => {
            cyberModalTitle.innerText = "⚠️ CONFIRMATION REQUIRED";
            cyberModalTitle.className = "cyber-modal-title warning";
            cyberModalBody.innerText = message;
            
            cyberModalActions.innerHTML = '';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cyber-modal-btn';
            cancelBtn.innerText = 'CANCEL';
            cancelBtn.onclick = () => {
                modalOverlay.classList.remove('active');
                resolve(false);
            };
            
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'cyber-modal-btn danger';
            confirmBtn.innerText = 'CONFIRM';
            confirmBtn.onclick = () => {
                modalOverlay.classList.remove('active');
                resolve(true);
            };
            
            cyberModalActions.appendChild(cancelBtn);
            cyberModalActions.appendChild(confirmBtn);
            
            modalOverlay.classList.add('active');
            setTimeout(() => confirmBtn.focus(), 50);
        });
    };
})();
