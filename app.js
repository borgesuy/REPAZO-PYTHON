const PyLogic = (() => {
  const STORAGE_KEY = "pylogic_students_v1";
  const CURRENT_KEY = "pylogic_current_v1";
  const DOC_PASS = "3759";

  let pyodide = null;
  let pyodideLoading = null;
  let state = null;

  const levels = [
    {
      title: "1. Mensajes y f-strings",
      theory: `En Python, las <code>f-strings</code> permiten insertar variables dentro de un texto anteponiendo la letra <code>f</code> antes de las comillas y encerrando la variable entre llaves <code>{ }</code>.`,
      consigna: `Usa una <code>f-string</code> para imprimir el mensaje: <strong>"Usuario: Ana | Nivel: 5"</strong> utilizando las variables dadas.`,
      starter: `usuario = "Ana"\nnivel = 5\n\n# Usa print(f"...") para mostrar el mensaje requerido`,
      expected: ["Usuario: Ana | Nivel: 5"],
      hints: ["Escribe print(f\"...\").", "Coloca {usuario} y {nivel} dentro de la cadena.", "Verifica que el separador sea ' | '."]
    },
    {
      title: "2. Decisiones con IF, ELIF y ELSE",
      theory: `La estructura <code>if-elif-else</code> permite evaluar múltiples condiciones en orden descendente o por rangos.`,
      consigna: `Si <code>puntos</code> es mayor o igual a 80 muestra <strong>"Excelente"</strong>; si es mayor o igual a 50 muestra <strong>"Aprobado"</strong>; si no, muestra <strong>"Repasar"</strong>.`,
      starter: `puntos = 85\n\n# Evalúa la variable puntos`,
      expected: ["excelente"],
      hints: ["Comienza con if puntos >= 80:", "Usa elif puntos >= 50:", "Cierra con else:"]
    },
    {
      title: "3. Trabajo con Textos (Strings)",
      theory: `Los textos poseen métodos integrados como <code>.upper()</code> (mayúsculas), <code>.lower()</code> (minúsculas) y la función <code>len()</code> para contar caracteres.`,
      consigna: `Convierte la cadena <code>codigo</code> a mayúsculas usando <code>.upper()</code> e imprímela.`,
      starter: `codigo = "pylogic2026"\n\n# Imprime el código en mayúsculas`,
      expected: ["PYLOGIC2026"],
      hints: ["Usa el método .upper().", "Puedes hacer print(codigo.upper()).", "No olvides los paréntesis en .upper()."]
    },
    {
      title: "4. Listas y Colecciones",
      theory: `Las listas guardan múltiples elementos entre corchetes <code>[ ]</code>. Se agregan elementos con <code>.append()</code> y se accede por índice desde <code>0</code>.`,
      consigna: `Agrega el elemento <strong>"Python"</strong> a la lista <code>cursos</code> utilizando <code>.append()</code> e imprime la lista.`,
      starter: `cursos = ["HTML", "CSS"]\n\n# Agrega "Python" e imprime la lista`,
      expected: ["['html', 'css', 'python']"],
      hints: ["Usa cursos.append(\"Python\").", "Posteriormente haz print(cursos).", "Las cadenas llevan comillas."]
    },
    {
      title: "5. Bucle FOR y range()",
      theory: `El bucle <code>for</code> junto a <code>range(inicio, fin)</code> permite iterar un número determinado de veces (el valor final no se incluye).`,
      consigna: `Usa un bucle <code>for</code> con <code>range(1, 4)</code> para imprimir cada número.`,
      starter: `# Escribe un bucle for que vaya del 1 al 3\n`,
      expected: ["123", "1 2 3"],
      hints: ["Escribe for i in range(1, 4):", "Dentro del bucle haz print(i).", "range(1, 4) genera los valores 1, 2 y 3."]
    },
    {
      title: "6. Bucle WHILE",
      theory: `El bucle <code>while</code> ejecuta un bloque de código mientras su condición continúe siendo verdadera.`,
      consigna: `Crea un bucle <code>while</code> que imprima <code>contador</code> mientras sea menor o igual a 3. Inicia <code>contador = 1</code> e incrementalo con <code>contador += 1</code>.`,
      starter: `contador = 1\n\n# Escribe el bucle while aquí`,
      expected: ["123"],
      hints: ["Usa while contador <= 3:", "Imprime contador dentro del bloque.", "Incrementa con contador += 1 en cada vuelta."]
    },
    {
      title: "7. Uso de Bibliotecas (math)",
      theory: `Python permite importar bibliotecas con <code>import</code>. Por ejemplo, <code>math.sqrt(x)</code> calcula la raíz cuadrada de <code>x</code>.`,
      consigna: `Importa la biblioteca <code>math</code> e imprime la raíz cuadrada del número <code>64</code>.`,
      starter: `# Importa math y calcula la raíz cuadrada de 64\n`,
      expected: ["8.0", "8"],
      hints: ["Escribe import math en la primera línea.", "Usa math.sqrt(64).", "Muestra el resultado con print()."]
    },
    {
      title: "8. Desafío Integrador Final",
      theory: `Integra conceptos: procesa una lista de notas, calcula el promedio o filtra valores y muestra un reporte formateado.`,
      consigna: `Recorre la lista <code>notas = [7, 8, 10]</code> con un bucle <code>for</code> e imprime cada nota en el formato <strong>"Nota: X"</strong>.`,
      starter: `notas = [7, 8, 10]\n\n# Recorre e imprime usando f-strings`,
      expected: ["nota: 7", "nota: 8", "nota: 10"],
      hints: ["Usa for n in notas:", "Dentro del bucle escribe print(f\"Nota: {n}\").", "Asegúrate de respetar el formato exacto."]
    }
  ];

  const $ = id => document.getElementById(id);
  const normalize = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();

  function escapeHTML(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function emptyLevel(){
    return {attempts:0,hints:0,correct:false,validatedCode:"",executedCode:"",lastOutput:""};
  }

  function newState(){
    return {
      name:"", username:"", group:"", liceo:"",
      currentLevel:0, completed:false, totalAttempts:0, totalHints:0,
      levels: levels.map(() => emptyLevel()),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
  }

  function loadStudents(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")}catch{return []}
  }

  function saveStudents(list){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function saveCurrent(){
    if(!state)return;
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(CURRENT_KEY, JSON.stringify(state));
    upsertStudent(state);
  }

  function upsertStudent(s){
    const list = loadStudents();
    const idx = list.findIndex(x => x.username.toLowerCase() === s.username.toLowerCase());
    if(idx >= 0) list[idx] = JSON.parse(JSON.stringify(s)); else list.push(JSON.parse(JSON.stringify(s)));
    saveStudents(list);
  }

  async function ensurePyodide(){
    if(pyodide)return pyodide;
    if(pyodideLoading)return pyodideLoading;
    if(typeof loadPyodide !== "function") throw new Error("No se pudo cargar Pyodide.");
    pyodideLoading = loadPyodide();
    pyodide = await pyodideLoading;
    return pyodide;
  }

  async function executePython(code){
    const py = await ensurePyodide();
    const output = [];
    py.setStdout({batched: s => output.push(s)});
    py.setStderr({batched: s => output.push(s)});
    py.globals.set("input", (...args) => "");
    try{
      await py.runPythonAsync(code);
      return {ok: true, output: output.join("") || "(El programa no produjo salida.)"};
    }catch(err){
      return {ok: false, output: String(err)};
    }
  }

  function showView(id){
    ["viewLogin","viewLevel","viewFinal"].forEach(v => {
      const el = $(v);
      if(el) el.style.display = (v === id) ? "block" : "none";
    });
  }

  function updateProgress(){
    const totalLevels = levels.length;
    const completed = state ? state.levels.filter(x => x.correct).length : 0;
    const progressBox = $("headerProgressBox");
    const btnSalir = $("btnSalir");

    if(progressBox) progressBox.style.display = state ? "block" : "none";
    if(btnSalir) btnSalir.style.display = state ? "inline-flex" : "none";
    if(!state) return;
    
    $("progressLabelText").textContent = state.completed 
      ? "Taller completado" 
      : `Nivel ${Math.min(state.currentLevel + 1, totalLevels)} de ${totalLevels}`;
    $("headerProgressBar").style.width = `${(completed / totalLevels) * 100}%`;
  }

  function renderLevel(){
    if(!state) return;
    const i = state.currentLevel;
    const l = levels[i];
    
    if(!l || i >= levels.length){
      renderFinal();
      return;
    }

    showView("viewLevel");

    // Muestra datos del usuario actual sobre el panel del nivel
    const badgeEl = $("userLevelBadge");
    if(badgeEl){
      badgeEl.innerHTML = `👤 <strong>Estudiante:</strong> ${escapeHTML(state.name)} (${escapeHTML(state.username)}) &nbsp;|&nbsp; 🏫 <strong>Grupo:</strong> ${escapeHTML(state.group)}`;
    }

    $("levelBadge").textContent = `NIVEL ${i + 1}`;
    $("levelTitle").textContent = l.title;
    $("levelTheory").innerHTML = l.theory;
    $("levelConsigna").innerHTML = `<strong>🎯 Consigna:</strong><br>${l.consigna}<hr><strong>📌 Código inicial:</strong><pre>${escapeHTML(l.starter)}</pre>`;
    $("codeEditor").value = state.levels[i].executedCode || l.starter;
    $("terminalOutput").textContent = state.levels[i].lastOutput || "Presiona 'Ejecutar' para ver la salida del programa...";
    $("hintCount").textContent = state.levels[i].hints;
    $("hintText").style.display = "none";
    $("hintText").innerHTML = "";
    $("aiPedagogicalMessage").style.display = state.levels[i].attempts > 0 && !state.levels[i].correct ? "block" : "none";
    updateProgress();
  }

  function outputMatches(level, output){
    const o = normalize(output);
    return level.expected.some(e => o.includes(normalize(e)));
  }

  async function ejecutarCodigo(){
    if(!state)return;
    const code = $("codeEditor").value;
    if(!code.trim()){ $("terminalOutput").textContent = "Escribe código antes de ejecutar."; return; }
    $("terminalOutput").textContent = "⏳ Ejecutando Python...";
    state.levels[state.currentLevel].executedCode = code;
    const result = await executePython(code);
    state.levels[state.currentLevel].lastOutput = result.output;
    saveCurrent();
    $("terminalOutput").textContent = (result.ok ? "" : "❌ Error:\n") + result.output;
  }

  async function comprobarSolucion(){
    if(!state)return;
    const i = state.currentLevel;
    const code = $("codeEditor").value;
    if(!code.trim()){ $("terminalOutput").textContent = "Escribe una solución antes de comprobar."; return; }

    state.levels[i].attempts++;
    state.totalAttempts++;
    state.levels[i].executedCode = code;
    $("terminalOutput").textContent = "⏳ Comprobando...";
    const result = await executePython(code);
    state.levels[i].lastOutput = result.output;

    if(result.ok && outputMatches(levels[i], result.output)){
      state.levels[i].correct = true;
      state.levels[i].validatedCode = code;
      state.levels[i].validatedAt = new Date().toISOString();
      $("terminalOutput").textContent = "✅ ¡Solución correcta!\n\n" + result.output;
      saveCurrent();
      setTimeout(() => {
        if(i < levels.length - 1){
          state.currentLevel++;
          saveCurrent();
          renderLevel();
        }else{
          state.completed = true;
          saveCurrent();
          renderFinal();
        }
      }, 700);
    }else{
      state.levels[i].correct = false;
      $("aiPedagogicalMessage").style.display = "block";
      saveCurrent();
      $("terminalOutput").textContent = (result.ok ? "" : "❌ Error:\n") + result.output + "\n\n💡 Revisá la consigna y probá nuevamente.";
    }
    updateProgress();
  }

  function pedirPista(){
    if(!state)return;
    const i = state.currentLevel;
    const lstate = state.levels[i];
    if(lstate.hints >= 3){
      $("hintText").style.display = "block";
      $("hintText").innerHTML = "Ya utilizaste las 3 pistas disponibles para este nivel.";
      return;
    }
    lstate.hints++;
    state.totalHints++;
    saveCurrent();
    $("hintCount").textContent = lstate.hints;
    $("hintText").style.display = "block";
    $("hintText").innerHTML = `💡 ${levels[i].hints[lstate.hints - 1]}`;
  }

  function limpiarEditor(){
    $("codeEditor").value = "";
    $("terminalOutput").textContent = "Editor limpio. Escribe tu código Python.";
  }

  function calculateGrade(s){
    if(!s || !s.levels) return 0;
    const correct = s.levels.filter(x => x.correct).length;
    
    let grade = (correct / levels.length) * 10;
    const penalty = Math.min(s.totalHints * 0.1, 0.5);
    grade = Math.max(0, grade - penalty);
    
    return Math.round(grade * 10) / 10;
  }

  function interpretation(n){
    if(n === 0) return "Sin iniciar";
    if(n >= 9) return "Desempeño excelente";
    if(n >= 7) return "Muy buen desempeño";
    if(n >= 6) return "Desempeño satisfactorio";
    return "En progreso / Debe practicar";
  }

  function renderFinal(){
    showView("viewFinal");
    const grade = calculateGrade(state);
    const correct = state.levels.filter(x => x.correct).length;
    
    $("finalNotaLibreta").textContent = `${grade}/10`;
    $("finalInterpretacion").textContent = interpretation(grade);
    $("finalPorcentaje").textContent = `${Math.round((correct / levels.length) * 100)}%`;
    $("finalCorrectas").textContent = `${correct}/${levels.length}`;
    $("finalIntentos").textContent = state.totalAttempts;
    $("finalPistas").textContent = state.totalHints;
    $("finalBadgesContainer").innerHTML = `<span class="master-badge">🐍 PYTHON MASTER</span><span class="master-badge">💻 LAB CODE</span>`;
    updateProgress();
  }

  function abrirReporteModal(){
    if(!state){
      try{ state = JSON.parse(localStorage.getItem(CURRENT_KEY) || "null"); }catch{}
    }
    if(!state){
      alert("Para ver el reporte, primero debes ingresar datos y presionar 'Comenzar'.");
      return;
    }
    renderReporte();
    $("modalReporte").style.display = "flex";
  }

  function renderReporte(){
    if(!state) return;
    const correct = state.levels.filter(x => x.correct).length;
    const grade = calculateGrade(state);
    
    $("repNombre").textContent = state.name;
    $("repUsuario").textContent = state.username;
    $("repGrupo").textContent = state.group;
    $("repLiceo").textContent = state.liceo;
    $("repNotaLibreta").textContent = `${grade}/10`;
    $("repEstadoPill").textContent = state.completed ? "🟢 Finalizado" : "🟡 En curso";
    $("repPorcentaje").textContent = `${Math.round((correct / levels.length) * 100)}%`;
    $("repActividades").textContent = `${correct}/${levels.length}`;
    $("repIntentos").textContent = state.totalAttempts;
    $("repPistas").textContent = state.totalHints;

    $("repTablaNiveles").innerHTML = state.levels.map((l, i) => `
      <tr>
        <td>Nivel ${i + 1}<br><small>${escapeHTML(levels[i]?.title || "")}</small></td>
        <td>${l.correct ? "🟢 Correcto" : "⚪ Pendiente"}</td>
        <td>${l.correct ? "1" : "0"}</td>
        <td>${l.attempts}</td>
        <td>${l.hints}</td>
      </tr>`).join("");

    $("repCodigoValidadoSec").innerHTML = state.levels.map((l, i) => `
      <div class="validated-code-card">
        <div class="validated-code-title">
          Nivel ${i + 1} — ${escapeHTML(levels[i]?.title || "")}
          ${l.correct ? " ✅ VALIDADO" : " — Sin validación"}
        </div>
        <pre class="validated-code">${l.validatedCode ? escapeHTML(l.validatedCode) : "No existe código validado para este nivel."}</pre>
      </div>`).join("");
  }

  function cerrarModal(id){ $(id).style.display = "none"; }

  function descargarPDFReporte(){
    renderReporte();
    const element = $("reporteContenidoImprimible");
    if(typeof html2pdf === "undefined"){
      alert("La biblioteca PDF no se pudo cargar. Utiliza la opción 'Imprimir' y selecciona 'Guardar como PDF'.");
      return;
    }
    const options = {
      margin: 8,
      filename: `PyLogic_Reporte_${state ? state.username : "estudiante"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 1.5, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };
    html2pdf().set(options).from(element).save();
  }

  function abrirModalDocente(){
    $("modalDocente").style.display = "flex";
    $("docenteAuthBox").style.display = "block";
    $("docenteDashboardBox").style.display = "none";
  }

  function autenticarDocente(){
    if($("inputPassDocente").value !== DOC_PASS){ alert("Clave incorrecta."); return; }
    $("docenteAuthBox").style.display = "none";
    $("docenteDashboardBox").style.display = "block";
    renderDocente();
  }

  function renderDocente(){
    const list = loadStudents();
    const completed = list.filter(s => s.completed);
    const activeGrades = list.map(calculateGrade).filter(n => n !== null);
    $("docTotalUsuarios").textContent = list.length;
    $("docUsuariosActivos").textContent = list.filter(s => !s.completed && s.levels.some(x => x.attempts > 0)).length;
    $("docFinalizados").textContent = completed.length;
    $("docPromedioGeneral").textContent = activeGrades.length ? (activeGrades.reduce((a, b) => a + b, 0) / activeGrades.length).toFixed(1) + " / 10" : "0.0 / 10";
    renderDocTable(list);
  }

  function renderDocTable(list){
    const q = normalize($("docSearchInput").value);
    const filtered = list.filter(s => 
      normalize(s.name).includes(q) || 
      normalize(s.username).includes(q) ||
      normalize(s.group).includes(q)
    );

    $("docTablaEstudiantes").innerHTML = filtered.length ? filtered.map(s => {
      const correct = s.levels.filter(x => x.correct).length;
      const grade = calculateGrade(s);
      return `<tr>
        <td>${escapeHTML(s.name)}</td>
        <td>${escapeHTML(s.username)}</td>
        <td>${escapeHTML(s.group)}</td>
        <td>${correct}/${levels.length}</td>
        <td><strong>${grade}/10</strong></td>
        <td>${s.completed ? "🟢 Finalizado" : "🟡 En curso"}</td>
        <td><button class="btn btn-small btn-primary" onclick="PyLogic.verReporteEstudiante('${encodeURIComponent(s.username)}')">REPORTE</button></td>
      </tr>`;
    }).join("") : `<tr><td colspan="7">No hay estudiantes registrados.</td></tr>`;
  }

  function filtrarTablaDocente(){ renderDocTable(loadStudents()); }

  function verReporteEstudiante(encoded){
    const username = decodeURIComponent(encoded);
    const found = loadStudents().find(s => s.username === username);
    if(!found) return;
    state = found;
    localStorage.setItem(CURRENT_KEY, JSON.stringify(state));
    abrirReporteModal();
  }

  function reiniciarAvance(){
    if(!confirm("¿Querés reiniciar todos los niveles de este estudiante?")) return;
    const identity = { name: state.name, username: state.username, group: state.group, liceo: state.liceo };
    state = Object.assign(newState(), identity);
    saveCurrent();
    renderLevel();
  }

  function cerrarSesion(){
    if(confirm("¿Estás seguro de que deseas salir? Tu progreso quedará guardado para cuando vuelvas a ingresar.")){
      localStorage.removeItem(CURRENT_KEY);
      state = null;
      showView("viewLogin");
      updateProgress();
    }
  }

  function bindEvents(){
    if($("btnPista")) $("btnPista").onclick = pedirPista;
    if($("btnLimpiar")) $("btnLimpiar").onclick = limpiarEditor;
    if($("btnEjecutar")) $("btnEjecutar").onclick = ejecutarCodigo;
    if($("btnComprobar")) $("btnComprobar").onclick = comprobarSolucion;
    if($("btnReporteGlobal")) $("btnReporteGlobal").onclick = abrirReporteModal;
    if($("btnPanelDocente")) $("btnPanelDocente").onclick = abrirModalDocente;
    if($("btnSalir")) $("btnSalir").onclick = cerrarSesion;
    if($("btnVerReporteFinal")) $("btnVerReporteFinal").onclick = abrirReporteModal;
    if($("btnPDFFinal")) $("btnPDFFinal").onclick = descargarPDFReporte;
    if($("btnReintentar")) $("btnReintentar").onclick = reiniciarAvance;
    if($("closeReporte")) $("closeReporte").onclick = () => cerrarModal("modalReporte");
    if($("btnCerrarReporte")) $("btnCerrarReporte").onclick = () => cerrarModal("modalReporte");
    if($("btnImprimir")) $("btnImprimir").onclick = () => window.print();
    if($("btnPDFReporte")) $("btnPDFReporte").onclick = descargarPDFReporte;
    if($("closeDocente")) $("closeDocente").onclick = () => cerrarModal("modalDocente");
    if($("btnAutenticar")) $("btnAutenticar").onclick = autenticarDocente;
    if($("docSearchInput")) $("docSearchInput").oninput = filtrarTablaDocente;
  }

  return {
    init(){
      bindEvents();
      const current = localStorage.getItem(CURRENT_KEY);
      if(current){
        try{
          const s = JSON.parse(current);
          if(s && s.username && s.levels){
            this.iniciarSesion(s);
            return;
          }
        }catch{}
      }
      showView("viewLogin");
      updateProgress();
    },
    pedirPista, limpiarEditor, ejecutarCodigo, comprobarSolucion, abrirReporteModal,
    cerrarModal, descargarPDFReporte, abrirModalDocente, autenticarDocente,
    filtrarTablaDocente, verReporteEstudiante, reiniciarAvance, cerrarSesion,
    iniciarSesion(s){
      state = s; 
      while(state.levels.length < levels.length){
        state.levels.push(emptyLevel());
      }
      saveCurrent();
      if(state.completed) renderFinal(); else renderLevel();
    }
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  PyLogic.init();

  const form = document.getElementById("formIngreso");
  if(form){
    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("inputNombre").value.trim();
      const username = document.getElementById("inputUsuario").value.trim();
      const group = document.getElementById("inputGrupo").value.trim();
      const liceo = document.getElementById("inputLiceo").value.trim();
      if(!name || !username || !group || !liceo){ form.reportValidity(); return; }

      let list = []; try{ list = JSON.parse(localStorage.getItem("pylogic_students_v1") || "[]"); }catch{}
      let s = list.find(x => x.username.toLowerCase() === username.toLowerCase());

      if(s){
        if(!confirm("Este usuario ya tiene un avance guardado. ¿Querés continuar desde donde quedó?")) return;
        s.name = name; s.group = group; s.liceo = liceo;
      }else{
        s = {
          name, username, group, liceo, currentLevel: 0, completed: false, totalAttempts: 0, totalHints: 0,
          levels: Array.from({length: 8}, () => ({attempts: 0, hints: 0, correct: false, validatedCode: "", executedCode: "", lastOutput: ""})),
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        list.push(s);
      }

      localStorage.setItem("pylogic_current_v1", JSON.stringify(s));
      localStorage.setItem("pylogic_students_v1", JSON.stringify(list));
      PyLogic.iniciarSesion(s);
    });
  }
});