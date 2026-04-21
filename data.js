/**
 * QA Impact — Datos cruzados por fase de QA Task (Análisis · Diseño · Ejecución)
 * Fuentes:
 *   - outputs/metricas-producto-fase1/qa_ai_impact/metricas_por_fase_por_sprint.csv
 *   - outputs/metricas-producto-fase1/qa_ai_impact/metricas_por_fase_por_grupo.csv
 *   - outputs/metricas-producto-fase1/ado-raw-data.json (cruce WIQL por usuario)
 *   - outputs/pipeline-state.json (Sprint 16 en curso)
 *
 * Ventana comparativa (4 sprints):
 *   - sinIA  = CORE · Sprints 12–13  (baseline)
 *   - conIA  = CORE · Sprints 15–16  (tratamiento)
 *   - Sprints 11 y 14 excluidos del comparativo (outliers de transición).
 */
window.METRICAS_FASE1 = {
  meta: {
    tituloInforme: "MIS RESULTADOS · QA IMPACT",
    subtituloCorto:
      "Análisis y Diseño se aceleran de horas a minutos por tarea. Ese tiempo liberado se reinvierte en Ejecución, fase que aún afinamos: los agentes están en entrenamiento y seguimos detectando criterios omitidos que producto rechaza.",
    periodo: "CORE · Sprints 12–13 (sin IA) vs 15–16 (con IA)",
    sprint: "CORE - Sprint 16",
    fecha: "2026-04-21",
    equipo: "QA — Mis Resultados (Jorge · Jhonatan)",
    tags: ["QA", "Pipeline IA", "Análisis", "Diseño", "Ejecución", "4 sprints"],
  },

  presentacion: {
    eyebrow: "Presentación",
    titulo: "Quién impulsa la calidad en Mis Resultados",
    lede:
      "Pipeline Fase 1, evidencias y alineación con negocio: el trabajo de QA recae en el binomio de pruebas, con la dirección de producto a cargo del PO del equipo Mis Resultados.",
    miembros: [
      {
        tipo: "qa",
        nombre: "Jorge Vásquez",
        iniciales: "JV",
        rol: "QA",
        linea:
          "Cobertura baseline y transición al pipeline asistido; participación transversal en ADO y en la definición operativa del flujo.",
      },
      {
        tipo: "qa",
        nombre: "Jhonatan Linares",
        iniciales: "JL",
        rol: "QA",
        linea:
          "Ejecución intensiva Sprint 16, evidencias por caso y publicación de runs en Azure DevOps.",
      },
      {
        tipo: "po",
        nombre: "Adolfo Munera",
        iniciales: "AM",
        rol: "Product Owner",
        linea:
          "PO a cargo del equipo de producto Mis Resultados: priorización, visión de valor y cierre con stakeholders.",
      },
    ],
  },

  referencia: {
    minManualPorQATask: 60,
    minAsistidoPorQATask: 5,
    fuente: "Referencia operativa equipo QA · pipeline Fase 1",
  },

  pipeline: {
    sprintActivo: "CORE - Sprint 16",
    usProcesadas: 22,
    tcsGenerados: 123,
    usPublicadas: 6,
    tcsEjecutados: 59,
    passRate: 98.3,
    fuente: "outputs/pipeline-state.json · last-ado-publish-us*.json",
  },

  /* =========================================================
   * Hero — impacto real por fase (Análisis / Diseño / Ejecución)
   * Reemplaza la comparación genérica 60′/5′: cifras por fase
   * y card de estado honesto para Ejecución (WIP).
   * ======================================================= */
  impactoPorFase: {
    eyebrow: "Impacto medido",
    titulo: "Antes y ahora, fase por fase",
    lede:
      "El volumen de tareas de Análisis y Diseño por sprint se mantiene — seguimos cubriendo el mismo alcance de US. Lo que cambió es el tiempo por tarea: horas se volvieron minutos, y esas horas liberadas se reinvierten en Ejecución.",
    fases: [
      {
        key: "analisis",
        titulo: "Análisis de requerimientos",
        icono: "01",
        color: "#1E6BFF",
        colorSoft: "rgba(30, 107, 255, 0.12)",
        antesValor: "1–2 h",
        antesUnidad: "por tarea",
        ahoraValor: "~10 min",
        ahoraUnidad: "por tarea",
        nota: "Mismo volumen de análisis por sprint; el ahorro es puramente tiempo/tarea. La IA asiste con ingesta y borrador ISTQB.",
      },
      {
        key: "diseno",
        titulo: "Diseño de casos",
        icono: "02",
        color: "#F5A623",
        colorSoft: "rgba(245, 166, 35, 0.14)",
        antesValor: "2–3 h",
        antesUnidad: "por tarea",
        ahoraValor: "~20 min",
        ahoraUnidad: "por tarea",
        nota: "Mismo alcance de diseño por sprint. Las horas que antes se iban aquí ahora se invierten en ejecutar más TCs por US.",
      },
      {
        key: "ejecucion",
        titulo: "Ejecución de casos",
        icono: "03",
        color: "#00C48C",
        colorSoft: "rgba(0, 196, 140, 0.12)",
        estado: "wip",
        estadoLabel: "En curso · Entrenando agentes",
        nota:
          "Ganamos horas aquí gracias al ahorro en Análisis y Diseño. Aún afinamos la asistencia: la IA omite criterios en algunas US y producto sigue rechazando trabajos por cobertura incompleta. Foco actual: subir la efectividad de prueba de criterios.",
      },
    ],
  },

  /* =========================================================
   * KPIs — cabecera de 6 indicadores claros para stakeholders
   * ======================================================= */
  kpis: [
    {
      label: "QA Tasks sin IA (S12–13)",
      value: 95,
      suffix: "",
      hint: "Baseline manual · 2 QAs, 2 sprints",
      accent: "coral",
    },
    {
      label: "QA Tasks con IA (S15–16)",
      value: 195,
      suffix: "",
      hint: "Pipeline asistido · +100 tareas (+105,3%)",
      accent: "teal",
    },
    {
      label: "Productividad por QA",
      value: 105.3,
      suffix: "%",
      hint: "Crecimiento medio: 23,75 → 48,75 tareas/sprint/QA",
      accent: "teal",
    },
    {
      label: "TCs por tarea de Diseño",
      value: 30.6,
      suffix: "%",
      hint: "5,66 → 7,39 TCs vinculados (+30,6%)",
      accent: "blue",
    },
    {
      label: "Sprint 16 — US procesadas",
      value: 22,
      suffix: "",
      hint: "Pipeline Fase 1 · 123 Test Cases publicados",
      accent: "teal",
    },
    {
      label: "Sprint 16 — Pass rate ejecución",
      value: 98.3,
      suffix: "%",
      hint: "58 PASS · 1 FAIL sobre 59 TCs ejecutados",
      accent: "amber",
    },
  ],

  /* =========================================================
   * FASES de QA Task — Análisis · Diseño · Ejecución
   * Cada fase trae totales pre/post, productividad, ciclo y
   * el breakdown por sprint (con delta% sprint a sprint).
   * ======================================================= */
  fases: [
    {
      key: "analisis",
      titulo: "Análisis de requerimientos",
      icono: "01",
      color: "#1E6BFF",
      colorSoft: "rgba(30, 107, 255, 0.12)",
      descripcion:
        "QA Task de análisis ISTQB: lectura de la US, descomposición de criterios de aceptación y reglas de negocio. La IA asiste con ingesta automática y borrador ISTQB-compatible.",
      totales: {
        sinIA: { tareas: 38, cerradas: 38, ciclodiasMediana: 7.4, productividadPorQA: 19 },
        conIA: { tareas: 41, cerradas: 39, ciclodiasMediana: 14.2, productividadPorQA: 20.5 },
        deltaTareasPct: 7.9,
        deltaProductividadPct: 7.9,
      },
      kpis: [
        { label: "Tareas · sin IA", value: 38, accent: "coral" },
        { label: "Tareas · con IA", value: 41, accent: "blue" },
        { label: "Cierre completo", value: 95.1, suffix: "%", accent: "teal", hint: "39 de 41 cerradas" },
      ],
      porSprint: [
        { sprint: "S12", grupo: "sin IA", tareas: 15, productividad: 7.5,  delta: null },
        { sprint: "S13", grupo: "sin IA", tareas: 23, productividad: 11.5, delta: 53.3 },
        { sprint: "S15", grupo: "con IA", tareas: 15, productividad: 7.5,  delta: -34.8 },
        { sprint: "S16", grupo: "con IA", tareas: 26, productividad: 13.0, delta: 73.3 },
      ],
      lectura: [
        "Volumen de análisis crece +7,9% con IA: el cuello de botella no estaba aquí.",
        "Cierre completo 95,1% con IA (vs 100% pre) — 2 tareas quedaron abiertas en S16.",
        "Mayor tiempo de ciclo (7,4 d → 14,2 d) refleja la mayor profundidad documental del pipeline.",
      ],
    },
    {
      key: "diseno",
      titulo: "Diseño de casos",
      icono: "02",
      color: "#F5A623",
      colorSoft: "rgba(245, 166, 35, 0.14)",
      descripcion:
        "QA Task de diseño: derivación de Test Cases desde ACs, clasificación por tipo (happy / alternativo / negativo) y alta en Test Plan. Principal beneficiario del pipeline asistido.",
      totales: {
        sinIA: {
          tareas: 38, cerradas: 38, ciclodiasMediana: 8.4, productividadPorQA: 19,
          tcsVinculados: 215, tcsPorTarea: 5.66,
        },
        conIA: {
          tareas: 44, cerradas: 42, ciclodiasMediana: 15.0, productividadPorQA: 22,
          tcsVinculados: 325, tcsPorTarea: 7.39,
        },
        deltaTareasPct: 15.8,
        deltaTCsPorTareaPct: 30.6,
        deltaProductividadPct: 15.8,
      },
      kpis: [
        { label: "Tareas · sin IA", value: 38, accent: "coral" },
        { label: "Tareas · con IA", value: 44, accent: "amber" },
        { label: "TCs por tarea", value: 7.39, accent: "teal", hint: "vs 5,66 sin IA (+30,6%)" },
      ],
      porSprint: [
        { sprint: "S12", grupo: "sin IA", tareas: 12, productividad: 6.0,  delta: null, tcs: 89 },
        { sprint: "S13", grupo: "sin IA", tareas: 26, productividad: 13.0, delta: 116.7, tcs: 126 },
        { sprint: "S15", grupo: "con IA", tareas: 15, productividad: 7.5,  delta: -42.3, tcs: 137 },
        { sprint: "S16", grupo: "con IA", tareas: 29, productividad: 14.5, delta: 93.3, tcs: 188 },
      ],
      lectura: [
        "Diseño genera más Test Cases por tarea: eficiencia +30,6% en TCs/tarea.",
        "Sprint 16: 188 TCs desde 29 tareas (vs 126 TCs en 26 tareas de S13).",
        "Volumen total crece +15,8% y la densidad de TCs por tarea sube un tercio.",
      ],
    },
    {
      key: "ejecucion",
      titulo: "Ejecución de casos",
      icono: "03",
      color: "#00C48C",
      colorSoft: "rgba(0, 196, 140, 0.12)",
      descripcion:
        "QA Task de ejecución: corrida del Test Case contra el entorno QA, captura de evidencia por paso y publicación del run en ADO. Fase donde el pipeline expande su cobertura real.",
      totales: {
        sinIA: { tareas: 6, cerradas: 6, ciclodiasMediana: 6.1, productividadPorQA: 3 },
        conIA: { tareas: 63, cerradas: 37, ciclodiasMediana: 40.5, productividadPorQA: 31.5 },
        deltaTareasPct: 950,
        deltaProductividadPct: 950,
        notaSprint16:
          "Sprint 16 en curso: ~24% cerradas en muestra analítica; cifras de ciclo medio se ajustarán al terminar la ejecución.",
      },
      kpis: [
        { label: "Tareas · sin IA", value: 6, accent: "coral" },
        { label: "Tareas · con IA", value: 63, accent: "teal" },
        { label: "Δ productividad / QA", value: 950, suffix: "%", accent: "teal", hint: "3 → 31,5 tareas/QA" },
      ],
      porSprint: [
        { sprint: "S12", grupo: "sin IA", tareas: 6,  productividad: 3.0,  delta: null },
        { sprint: "S13", grupo: "sin IA", tareas: 0,  productividad: 0,    delta: -100 },
        { sprint: "S15", grupo: "con IA", tareas: 22, productividad: 11.0, delta: null },
        { sprint: "S16", grupo: "con IA", tareas: 41, productividad: 20.5, delta: 86.4 },
      ],
      lectura: [
        "Volumen de ejecución se multiplica ×10,5 (6 → 63 tareas): mayor cobertura real.",
        "Sprint 16: 41 tareas de ejecución — la más alta del periodo analizado.",
        "Sprint 13 sin ejecuciones cerradas; el pipeline reactiva y escala esta fase.",
      ],
    },
  ],

  /* =========================================================
   * Productividad total por sprint (suma de todas las fases)
   * Con delta% sprint a sprint para narrativa temporal clara.
   * ======================================================= */
  productividadPorSprint: {
    titulo: "Productividad del equipo por sprint",
    subtitulo: "Total de QA Tasks cerradas por sprint × delta vs sprint anterior",
    nota: "Baseline: media 47,5 tareas/sprint · Con IA: media 97,5 tareas/sprint · Crecimiento medio +105,3%.",
    sprints: [
      { sprint: "S12", grupo: "sin IA", tareas: 43,  productividadPorQA: 21.5, delta: null },
      { sprint: "S13", grupo: "sin IA", tareas: 52,  productividadPorQA: 26.0, delta: 20.9 },
      { sprint: "S15", grupo: "con IA", tareas: 59,  productividadPorQA: 29.5, delta: 13.5, nota: "inicio pipeline asistido" },
      { sprint: "S16", grupo: "con IA", tareas: 136, productividadPorQA: 68.0, delta: 130.5, nota: "pipeline en régimen" },
    ],
    mediaSinIA: { tareas: 47.5, productividadPorQA: 23.75 },
    mediaConIA: { tareas: 97.5, productividadPorQA: 48.75 },
    crecimientoMediaPct: 105.3,
  },

  /* Composición de trabajo por fase (donut) — usa datos reales S15+S16 */
  charts: {
    donutFases: {
      titulo: "Distribución de QA Tasks con IA por fase",
      subtitulo: "Sprints 15–16 · 195 tareas totales",
      segmentos: [
        { label: "Análisis",  pct: 21.0, tareas: 41, color: "#1E6BFF" },
        { label: "Diseño",    pct: 22.6, tareas: 44, color: "#F5A623" },
        { label: "Ejecución", pct: 32.3, tareas: 63, color: "#00C48C" },
        { label: "Sin clasificar", pct: 24.1, tareas: 47, color: "#94A3B8" },
      ],
    },
    sprintBars: {
      titulo: "Evolución por sprint",
      subtitulo: "QA Tasks cerradas × fase (Análisis / Diseño / Ejecución)",
      sprints: ["S12", "S13", "S15", "S16"],
      series: [
        { label: "Análisis",  color: "#1E6BFF", valores: [15, 23, 15, 26] },
        { label: "Diseño",    color: "#F5A623", valores: [12, 26, 15, 29] },
        { label: "Ejecución", color: "#00C48C", valores: [6,  0,  22, 41] },
      ],
      separadorConIA: 1.5,
    },
  },

  sprints: {
    count: 4,
    sprintsLabel: "Sprints comparados",
    detalleSprints: "S12–13 sin IA · S15–16 con IA",
    userStories: 22,
    userStoriesLabel: "US procesadas (Sprint 16)",
    tcs: 123,
    tcsLabel: "Test Cases publicados",
    tcsSuffix: "",
  },

  fuentesDatos: {
    "qa_ai_impact/metricas_por_fase_por_sprint.csv": "Volúmenes y ciclo por fase × sprint",
    "qa_ai_impact/metricas_por_fase_por_grupo.csv": "Agregado pre/post por fase",
    "ado-raw-data.json": "QA Tasks por sprint × usuario (WIQL)",
    "pipeline-state.json": "US/TC Sprint 16 (pipeline en régimen)",
    "last-ado-publish-*.json": "Resultados de runs ADO (6 US · 58 PASS · 1 FAIL)",
  },

  roadmap: [
    {
      fase: "Fase 1",
      titulo: "Transaccional ADO",
      estado: "completada",
      descripcion:
        "Detección de sprint, QA Tasks idempotentes, Test Plan / Suite / TCs y vínculos automatizados por US.",
      hitos: ["22 US · Sprint 16", "123 Test Cases", "0% retrabajo"],
      accent: "teal",
    },
    {
      fase: "Fase 2",
      titulo: "Ejecución asistida E2E",
      estado: "en-curso",
      descripcion:
        "Runner + publicación de runs en ADO, evidencias por paso, cierre de QA Task al completar cobertura.",
      hitos: ["6 US publicadas", "59 TCs ejecutados", "98,3% pass rate"],
      accent: "amber",
    },
    {
      fase: "Fase 3",
      titulo: "Métricas de producto",
      estado: "planificada",
      descripcion: "Panel para stakeholders, tendencias por sprint, cobertura consolidada.",
      hitos: ["Tendencias por fase", "Panel stakeholders", "Cobertura histórica"],
      accent: "gris",
    },
  ],

  footer: {
    nota:
      "2026-04-21 · Datos reales cruzados desde Azure DevOps (WIQL) y análisis qa_ai_impact. Ventana comparativa: Sprints 12–13 (sin IA · 95 QA Tasks) vs 15–16 (con IA · 195 QA Tasks). Tiempos por fase (1–2 h→10 min, 2–3 h→20 min) = referencia operativa del equipo QA. Sprint 16 en curso: cifras de ejecución pueden moverse al cerrar el sprint.",
    fuente: "qa_ai_impact · ado-raw-data.json · pipeline-state.json · outputs/evidencias/",
  },
};
