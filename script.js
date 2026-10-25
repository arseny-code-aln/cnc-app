let scene, camera, renderer, controls, toolMesh, trajectoryLine, isInitialized3D = false;
let partsGroup = new THREE.Group();

// База данных материалов для расчетов
const MATERIALS = {
    steel: { name: "Сталь конструкционная", vc: 180, fz: 0.08 },
    stainless: { name: "Нержавейка (Inox)", vc: 120, fz: 0.06 },
    aluminum: { name: "Алюминий", vc: 450, fz: 0.12 },
    titanium: { name: "Титан", vc: 60, fz: 0.05 },
    cast_iron: { name: "Чугун", vc: 150, fz: 0.10 }
};

// Справочник G/M кодов
const CODES_DB = {
    "G00": "Быстрое позиционирование без обработки",
    "G01": "Линейная интерполяция (рабочая подача)",
    "G02": "Круговая интерполяция по часовой стрелке",
    "G03": "Круговая интерполяция против часовой стрелки",
    "G17": "Выбор плоскости XY",
    "G90": "Абсолютная система координат",
    "G91": "Относительная система координат",
    "M03": "Включение шпинделя по часовой стрелке",
    "M05": "Останов шпинделя",
    "M30": "Конец программы с возвратом в начало"
};

// Инициализация выпадающего списка материалов при загрузке
function initApp() {
    const sel = document.getElementById('reg-mat');
    if (!sel) return;
    sel.innerHTML = '';
    for (let k in MATERIALS) { 
        let o = document.createElement('option'); 
        o.value = k; 
        o.innerText = MATERIALS[k].name; 
        sel.appendChild(o); 
    }
}

// Быстрые подсказки для чата
function useQuickPrompt(text) {
    document.getElementById('chat-user-input').value = text;
    sendChatMessage();
}

// Офлайн ИИ-технолог (эмуляция ответов прямо в браузере)
async function sendChatMessage() {
    const input = document.getElementById('chat-user-input');
    const messageText = input.value.trim();
    if (!messageText) return;

    const messagesContainer = document.getElementById('chat-messages');
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.innerText = messageText;
    messagesContainer.appendChild(userBubble);

    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble assistant';
    loadingBubble.innerHTML = '⚙️ <i>Консультируюсь с базой знаний...</i>';
    messagesContainer.appendChild(loadingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    setTimeout(() => {
        messagesContainer.removeChild(loadingBubble);
        let reply = getSmartAIResponse(messageText);
        
        const botBubble = document.createElement('div');
        botBubble.className = 'chat-bubble assistant';
        botBubble.innerHTML = reply;
        messagesContainer.appendChild(botBubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 500);
}

function getSmartAIResponse(query) {
    let q = query.toLowerCase();
    if (q.includes('вибрац') || q.includes('титан')) {
        return "🤖 **Борьба с вибрацией:**\n1. Уменьшайте вылет инструмента.\n2. Снижайте скорость резания (Vc) на 25-30%.\n3. Увеличивайте подачу на зуб (fz).\n4. Используйте фрезы с переменным шагом спирали.";
    } else if (q.includes('wnmg') || q.includes('пластин')) {
        return "🤖 **Пластина WNMG:**\n• W — форма (треугольная с углом 80°)\n• N — задний угол 0°\n• M — класс точности\n• 080408 — размер (длина 8мм, толщина 4.76мм, радиус при вершине 0.8мм).";
    } else if (q.includes('g76') || q.includes('резьб')) {
        return "🤖 **Цикл G76 (Fanuc):**\nG76 P(m)(n)(a) Q(dmin) R(d);\nG76 X(u) Z(w) P(k) Q(d) F(f);\nГде m — кол-во чистовых проходов, a — угол профиля (60°), f — шаг резьбы.";
    } else {
        return `🤖 По вашему вопросу («${query}»): убедитесь в жесткости технологической системы СПИД (Станок-Приспособление-Инструмент-Деталь) и проверьте паспортные режимы резания инструмента.`;
    }
}

async function clearChat() {
    document.getElementById('chat-messages').innerHTML = '<div class="chat-bubble assistant">🤖 Диалог сброшен. Какой вопрос разберем?</div>';
}

function toggleMoreMenu() { document.getElementById('more-menu').classList.toggle('show'); }
document.querySelector('.content').addEventListener('click', () => document.getElementById('more-menu').classList.remove('show'));

function switchTab(id, title, btn, isPopup = false) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn, .popup-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    document.getElementById('page-title').innerText = title;
    
    if (id === 'viewer') {
        if (!isInitialized3D) {
            setTimeout(() => init3DViewer(), 100);
        } else {
            onWindowResize();
        }
    }

    if (isPopup) { btn.classList.add('active'); document.getElementById('nav-more').classList.add('active'); }
    else { btn.classList.add('active'); }
    document.getElementById('more-menu').classList.remove('show');
}

// 3D Симулятор на Three.js
function init3DViewer() {
    const container = document.getElementById('webgl-container');
    if (!container || isInitialized3D) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070c);

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(50, 40, 50);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    let dLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dLight.position.set(50, 100, 50);
    scene.add(dLight);

    let grid = new THREE.GridHelper(100, 10, 0x3b82f6, 0x1a2642);
    grid.position.y = -0.1;
    scene.add(grid);

    scene.add(partsGroup);

    toolMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 20, 16),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, metalness: 0.8 })
    );
    toolMesh.position.set(0, 10, 0);
    scene.add(toolMesh);

    isInitialized3D = true;
    addNewPart();
    loadAndRenderTrajectory();
    animate();

    window.addEventListener('resize', onWindowResize);
}

function addNewPart() {
    if (!isInitialized3D) return;
    const geometry = new THREE.BoxGeometry(30, 15, 30);
    const material = new THREE.MeshPhysicalMaterial({ 
        color: 0x1d4ed8, 
        transparent: true, 
        opacity: 0.35,
        roughness: 0.2
    });
    const part = new THREE.Mesh(geometry, material);
    part.position.set(0, 7.5, 0);
    partsGroup.clear();
    partsGroup.add(part);
}

function loadSTLFile(event) {
    const file = event.target.files[0];
    if (!file || !isInitialized3D) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const loader = new THREE.STLLoader();
            const geometry = loader.parse(e.target.result);
            const material = new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.4, roughness: 0.3 });
            const mesh = new THREE.Mesh(geometry, material);
            geometry.center();
            mesh.position.set(0, 5, 0);
            partsGroup.clear();
            partsGroup.add(mesh);
        } catch (err) {
            alert("Ошибка при чтении STL файла: " + err);
        }
    };
    reader.readAsArrayBuffer(file);
}

function loadAndRenderTrajectory() {
    if (!isInitialized3D) return;
    const textArea = document.getElementById('gc-text');
    const text = textArea ? textArea.value : "";
    
    if (trajectoryLine) {
        scene.remove(trajectoryLine);
        if (trajectoryLine.geometry) trajectoryLine.geometry.dispose();
        if (trajectoryLine.material) trajectoryLine.material.dispose();
        trajectoryLine = null;
    }
    
    let pts = [new THREE.Vector3(0, 0, 0)];
    let cx = 0, cy = 0, cz = 0;
    
    for (let line of text.split('\n')) {
        let mx = line.match(/X\s*(-?[0-9.]+)/i);
        let my = line.match(/Y\s*(-?[0-9.]+)/i);
        let mz = line.match(/Z\s*(-?[0-9.]+)/i);
        
        if (mx || my || mz) { 
            cx = mx ? parseFloat(mx[1]) : cx; 
            cy = my ? parseFloat(my[1]) : cy; 
            cz = mz ? parseFloat(mz[1]) : cz; 
            pts.push(new THREE.Vector3(cx, cz, cy)); 
        }
    }
    
    if (pts.length > 1) {
        let last = pts[pts.length - 1]; 
        if (toolMesh) toolMesh.position.set(last.x, last.y + 10, last.z);
        
        const geometry = new THREE.BufferGeometry().setFromPoints(pts);
        const material = new THREE.LineBasicMaterial({ color: 0x3b82f6 });
        trajectoryLine = new THREE.Line(geometry, material);
        scene.add(trajectoryLine);
    }
}

function animate() {
    if (!isInitialized3D) return;
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('webgl-container');
    if (!container || !isInitialized3D) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// --- ВСЕ РАСЧЕТЫ И КАЛЬКУЛЯТОРЫ (Чистый JavaScript) ---

function calcRegimes() {
    let d = parseFloat(document.getElementById('reg-d').value) || 12;
    let z = parseInt(document.getElementById('reg-z').value) || 4;
    let matKey = document.getElementById('reg-mat').value;
    let mat = MATERIALS[matKey] || MATERIALS.steel;

    let n = Math.round((mat.vc * 1000) / (Math.PI * d));
    let vf = Math.round(n * z * mat.fz);

    let box = document.getElementById('reg-res');
    box.style.display = 'block';
    box.innerHTML = `Vc: <b>${mat.vc} м/мин</b> | fz: <b>${mat.fz} мм</b><br>Обороты: <b>${n} об/мин</b><br>Подача: <b>${vf} мм/мин</b>`;
}

function calcTurning() {
    let d = parseFloat(document.getElementById('turn-d').value) || 50;
    let vc = parseFloat(document.getElementById('turn-vc').value) || 200;
    let fr = parseFloat(document.getElementById('turn-fr').value) || 0.25;

    let n = Math.round((vc * 1000) / (Math.PI * d));
    let fm = Math.round(n * fr);

    let box = document.getElementById('turn-res');
    box.style.display = 'block';
    box.innerHTML = `Обороты: <b>${n} об/мин</b><br>Минутная подача: <b>${fm} мм/мин</b>`;
}

function calcThread() {
    let nom = parseFloat(document.getElementById('th-nom').value) || 10;
    let pitch = parseFloat(document.getElementById('th-pitch').value) || 1.5;
    let drillD = (nom - pitch).toFixed(2);

    let box = document.getElementById('th-res');
    box.style.display = 'block';
    box.innerHTML = `Регламент M${nom}x${pitch}<br>Сверло под резьбу: <b style="color:var(--success-color);">Ø ${drillD} мм</b>`;
}

function calcTolerance() {
    let nom = parseFloat(document.getElementById('tol-nom').value) || 40;
    let fit = document.getElementById('tol-fit').value;
    let es = 0, ei = 0;

    if (fit === 'H7') {
        let it = nom <= 3 ? 0.010 : nom <= 6 ? 0.012 : nom <= 30 ? 0.021 : nom <= 50 ? 0.025 : 0.035;
        es = it;
        ei = 0;
    } else { // h6
        let it = nom <= 6 ? 0.008 : nom <= 30 ? 0.013 : nom <= 50 ? 0.016 : 0.022;
        es = 0;
        ei = -it;
    }

    let minLimit = (nom + ei).toFixed(3);
    let maxLimit = (nom + es).toFixed(3);

    let box = document.getElementById('tol-res');
    box.style.display = 'block';
    box.innerHTML = `Поле: <b>${fit}</b> | Отклонения: +${es.toFixed(3)} / ${ei.toFixed(3)}<br>Пределы: <b>${minLimit} ... ${maxLimit} мм</b>`;
}

function calcPCD() {
    let r = parseFloat(document.getElementById('pcd-r').value) || 50;
    let count = parseInt(document.getElementById('pcd-count').value) || 6;
    let depth = parseFloat(document.getElementById('pcd-depth').value) || 15;
    
    let gcode = "G90 G54 G17\nG00 Z50.\n";
    for (let i = 0; i < count; i++) {
        let angle = (i * 360 / count) * (Math.PI / 180);
        let x = (r * Math.cos(angle)).toFixed(3);
        let y = (r * Math.sin(angle)).toFixed(3);
        gcode += `N${(i+1)*10} X${x} Y${y}\n`;
        gcode += `G81 Z-${depth} R2. F150\n`;
    }
    gcode += "G00 Z50. M30";

    let box = document.getElementById('pcd-res');
    box.style.display = 'block';
    box.innerHTML = `<pre style="font-size:0.7rem; max-height:80px; overflow:auto;">${gcode}</pre>`;
}

function validateCode() {
    let code = document.getElementById('gc-text').value;
    let warnings = [];
    let lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        let l = lines[i].trim().toUpperCase();
        if ((l.includes('G1') || l.includes('G01')) && !l.includes('F')) {
            warnings.push(`Строка ${i+1}: Движение G01 без подачи (F)`);
        }
    }
    if (!code.includes('Z25') && !code.includes('Z50')) {
        warnings.push("Рекомендуется безопасный отвод по Z в конце");
    }

    let box = document.getElementById('gc-res');
    box.style.display = 'block';
    box.innerHTML = warnings.length === 0 ? '✔ G-код выглядит безопасным' : '⚠ ' + warnings.join('<br>');
}

function calcTimeCost() {
    let code = document.getElementById('tc-gcode').value;
    let rate = parseFloat(document.getElementById('tc-rate').value) || 2500;
    let setup = parseFloat(document.getElementById('tc-setup').value) || 500;

    let lines = code.split('\n').length;
    let timeMin = Math.max(2, Math.round(lines * 0.25));
    let totalCost = Math.round(setup + (timeMin / 60) * rate);

    let box = document.getElementById('tc-res');
    box.style.display = 'block';
    box.innerHTML = `Время: <b>${timeMin} мин</b> | Цена: <b>${totalCost} руб.</b>`;
}

function searchCode() {
    let query = document.getElementById('code-input').value.trim().toUpperCase();
    let box = document.getElementById('code-res');
    box.style.display = 'block';
    if (CODES_DB[query]) {
        box.innerHTML = `<b>${query}:</b> ${CODES_DB[query]}`;
    } else {
        box.innerHTML = `<span style="color:var(--danger-color);">Код ${query} не найден</span>`;
    }
}

function exportCurrentGCode(name) {
    let code = document.getElementById('gc-text').value; 
    if (!code.trim()) return alert("Пусто!");
    
    let blob = new Blob([code], { type: 'text/plain' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `${name}.nc`;
    a.click();
    URL.revokeObjectURL(url);
}