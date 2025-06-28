// main.ts

// Configuración Inicial 
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Inicializa el tamaño del canvas. Esto es correcto.
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const mouse = { x: 0, y: 0 };

// --- Event Listeners ---
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.y;
});

let resizeTimeout: number;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // 1. Actualizar el tamaño del canvas SIEMPRE al redimensionar.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // 2. Volver a generar las partículas para el texto actual.
    // Es crucial que 'lastText' tenga el texto que estaba visible.
    // Pasamos 'true' para isResizing para que intente reubicar partículas.
    if (lastText) {
      createTextParticles(lastText, true); 
    }
  }, 250); // Pequeño retraso de 250ms. Ajusta si es necesario.
});

// --- Clase Particle ---
class Particle {
  x: number;
  y: number;
  baseX: number; // La posición X objetivo a la que la partícula intentará regresar
  baseY: number; // La posición Y objetivo a la que la partícula intentará regresar
  size: number;
  color: string;
  depth: number;
  initialHue: number;
  
  velX: number = 0;
  velY: number = 0;
  friction: number = 0.93;
  ease: number = 0.04; 

  constructor(x: number, y: number, color: string, startFromBottom: boolean = false) {
    this.baseX = x; // La posición X final deseada para esta partícula
    this.baseY = y; // La posición Y final deseada para esta partícula

    if (startFromBottom) {
      // Si startFromBottom es true, la partícula comienza desde abajo, fuera de la pantalla
      this.x = x + (Math.random() - 0.5) * 200; // Un poco de dispersión horizontal al inicio
      this.y = canvas.height + Math.random() * 50; // Comienza justo debajo del canvas + un poco más abajo
      this.velY = -Math.random() * 5 - 2; // Una velocidad inicial hacia arriba para un "salto"
    } else {
      // Si no, comienza en su posición base (inmediatamente o para un redimensionamiento)
      this.x = x;
      this.y = y;
    }

    this.size = Math.random() * 1.2 + 0.3;
    this.color = color;
    this.depth = Math.random() * 30;
    this.initialHue = Math.random() * 360;
  }

  // Método para actualizar la posición base de la partícula cuando cambia el diseño del texto
  setNewBasePosition(newX: number, newY: number) {
    this.baseX = newX;
    this.baseY = newY;
    // Opcional: para un movimiento más rápido hacia la nueva posición, puedes añadir una pequeña fuerza:
    // this.velX += (newX - this.x) * 0.05;
    // this.velY += (newY - this.y) * 0.05;
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    const z = Math.sin((time + this.depth * 50) / 1500) * 0.5 + 1;
    const currentSize = this.size * z;
    const offsetX = (this.x - canvas.width / 2) * z * 0.01; 
    const offsetY = (this.y - canvas.height / 2) * z * 0.01; 

    ctx.beginPath();

    const distFromMouse = Math.sqrt(
      (mouse.x - this.x) ** 2 + (mouse.y - this.y) ** 2
    );
    const maxBlur = 30; 
    const influenceRadius = 120; 
    let blurAmount = 0;
    let currentColor = this.color;

    if (distFromMouse < influenceRadius) {
      blurAmount = maxBlur * (1 - distFromMouse / influenceRadius);
      const hueShift = Math.sin(time / 100) * 30 + (1 - distFromMouse / influenceRadius) * 80; 
      currentColor = `hsl(${this.initialHue + hueShift}, 100%, 78%)`; 
    }

    ctx.shadowBlur = blurAmount;
    ctx.shadowColor = currentColor;
    ctx.fillStyle = currentColor;

    ctx.arc(this.x + offsetX, this.y + offsetY, currentSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  update() {
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const forceMagnitude = 120; 
    const pushStrength = 0.12; 

    if (dist < forceMagnitude) {
      const angle = Math.atan2(dy, dx);
      this.velX -= Math.cos(angle) * (forceMagnitude - dist) * pushStrength;
      this.velY -= Math.sin(angle) * (forceMagnitude - dist) * pushStrength;
    }

    // Estas líneas son las que hacen que la partícula regrese a su baseX/baseY
    // Aseguran que, al cambiar baseX/baseY, la partícula se mueva hacia allí.
    this.velX += (this.baseX - this.x) * this.ease;
    this.velY += (this.baseY - this.y) * this.ease;

    this.velX *= this.friction;
    this.velY *= this.friction;

    this.x += this.velX;
    this.y += this.velY;
  }
}

let particles: Particle[] = [];
let lastText: string = ""; // Guarda el último texto para poder recrearlo al redimensionar

// --- MODIFICACIONES CRÍTICAS EN createTextParticles para Reubicación y Densidad ---
function createTextParticles(text: string, isResizing: boolean = false) {
  lastText = text; // Asegura que lastText siempre se actualice

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCanvas.width = window.innerWidth; // Usa el tamaño actual de la ventana
  tempCanvas.height = window.innerHeight;

  // Calculo del tamaño de la fuente (ya mejorado)
  const minDimension = Math.min(tempCanvas.width, tempCanvas.height);
  let fontSize = minDimension / (text.length * 0.4); 
  fontSize = Math.max(20, Math.min(fontSize, 180)); 

  const gradient = tempCtx.createLinearGradient(0, 0, tempCanvas.width, 0);
  gradient.addColorStop(0, "#FF0077");
  gradient.addColorStop(0.25, "#FF4400");
  gradient.addColorStop(0.5, "#FFDD00");
  gradient.addColorStop(0.75, "#00DDFF");
  gradient.addColorStop(1, "#AA00FF");

  tempCtx.font = `bold ${fontSize}px 'Arial Black', sans-serif`;
  tempCtx.fillStyle = gradient;
  tempCtx.textAlign = "center";
  tempCtx.textBaseline = "middle";
  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);

  const imageData = tempCtx.getImageData(
    0,
    0,
    tempCanvas.width,
    tempCanvas.height
  ).data;

  // Ajuste dell pixelSkip para densidad. Este es nencesario para ver el efecto.
  // Calcula un pixelSkip basado en el área del canvas.
  // Puedes ajustar los valores para controlar la densidad.
  const idealParticleCount = 2000; // Número deseado de partículas para un texto promedio
  const currentArea = tempCanvas.width * tempCanvas.height;
  // Estima la densidad necesaria del pixelSkip. Ajusta el 500000 para cambiar la sensibilidad.
  const calculatedPixelSkip = Math.max(2, Math.round(Math.sqrt(currentArea / idealParticleCount)));
  const pixelSkip = Math.min(10, Math.max(4, calculatedPixelSkip)); // Limita entre 4 y 10 para evitar extremos

  const newParticlesArray: Particle[] = []; // Array temporal para las partículas válidas

  // Mapa para realizar un seguimiento de las partículas existentes y su disponibilidad
  const availableParticles = new Set(particles);

  for (let y = 0; y < tempCanvas.height; y += pixelSkip) {
    for (let x = 0; x < tempCanvas.width; x += pixelSkip) {
      const index = (y * tempCanvas.width + x) * 4;
      const alpha = imageData[index + 3];
      
      if (alpha > 128) { // Si el píxel es parte del texto
        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];
        const color = `rgb(${r},${g},${b})`;

        // Lógica de reutilización mejorada
        let foundParticle: Particle | undefined;
        // Solo intentamos reutilizar si estamos redimensionando y hay partículas disponibles
        if (isResizing && availableParticles.size > 0) {
            // Iterar sobre las partículas disponibles para encontrar la más cercana
            let minDistSq = Infinity; // Distancia al cuadrado para evitar Math.sqrt repetidos
            const searchRadiusSq = 100 * 100; // Radio de búsqueda (100px al cuadrado), ajusta si es necesario

            for (const p of availableParticles) {
                const dX = p.x - x;
                const dY = p.y - y;
                const distSq = dX * dX + dY * dY;
                
                if (distSq < minDistSq && distSq < searchRadiusSq) {
                    minDistSq = distSq;
                    foundParticle = p;
                }
            }

            if (foundParticle) {
                foundParticle.setNewBasePosition(x, y); // Establece la nueva posición base
                newParticlesArray.push(foundParticle); // Añade la partícula reutilizada al nuevo array
                availableParticles.delete(foundParticle); // Marca como usada
            }
        } 
        
        // Si no se encontró una partícula existente para reutilizar o no es un redimensionamiento
        if (!foundParticle) {
            // Crea una nueva partícula. Decide si viene de abajo.
            // Viene de abajo solo si es la carga inicial (lastText está vacío)
            newParticlesArray.push(new Particle(x, y, color, !lastText && !isResizing)); 
        }
      }
    }
  }
  
  particles = newParticlesArray; // Actualiza el array global de partículas con las nuevas/reutilizadas
}

function animate(time: number = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    p.update();
    p.draw(ctx, time);
  }

  requestAnimationFrame(animate);
}

const textInput = document.getElementById("textInput") as HTMLInputElement;
const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;

submitBtn.addEventListener("click", () => {
  const value = textInput.value.trim();
  if (value !== "") {
    lastText = "";
    
    createTextParticles(value.toUpperCase(), false); 
  }
});

// Llamada inicial: Carga el texto "FLUID CODE" y activa la animación de entrada "de abajo para arriba".
createTextParticles("UABJO", false); // false aquí significa que no es un redimensionamiento,
// pero la lógica interna del constructor de Particle
// determinará si es la primera carga (lastText está vacío)
// para la animación de abajo.
animate();