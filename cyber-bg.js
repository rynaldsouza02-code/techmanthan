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
})();
