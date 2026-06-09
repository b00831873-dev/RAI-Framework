// État dynamique de l'application
let appState = {
  currentPreset: null,       // 'HR', 'Legal', ou 'custom'
  activeDimension: 'all',    // 'all', 'Responsability', 'Trust', 'Performance'
  
  // Cartographie en temps réel : stocke le niveau actuel de CHAQUE métrique
  // Exemple: { "Bias Benchmark for QA (BBQ)": "high", "Tokenisation": "medium" }
  metricLevels: {},          
  
  // Liste des métriques décochées/retirées par l'utilisateur dans le studio
  disabledMetrics: new Set() 
};

// Base de données brute issue de l'Excel
let rawDb = {
  scores: [],   // Lignes du fichier scores.csv
  coefficients: {}, // { low: 0.03, medium: 0.05, high: 0.08 }
  presets: {}   // { HR: { "Métrique A": "high", "Métrique B": "medium" } }
};

// ═══ MOTEUR DE CALCUL DYNAMIQUE ═══

/**
 * Récupère le coefficient numérique d'une métrique selon son état actuel
 */
function getMetricCoefficient(metricName) {
  // Si la métrique est décochée dans l'interface, son poids devient 0
  if (appState.disabledMetrics.has(metricName)) return 0;
  
  const currentLevel = appState.metricLevels[metricName] || "medium"; // 'medium' par défaut
  return rawDb.coefficients[currentLevel] || 0;
}

/**
 * FONCTION CENTRALE : Calcule le score d'un modèle selon des filtres optionnels
 * @param {string} modelId - Nom du LLM (ex: 'mistral-7b')
 * @param {string} filterDimension - 'all' ou une dimension spécifique
 * @param {string} filterCategory - null ou une catégorie spécifique (Pillar)
 */
function computeWeightedScore(modelId, filterDimension = "all", filterCategory = null) {
  let totalWeightedScores = 0;
  let totalWeights = 0;

  // Filtrer les lignes de scores correspondant au modèle et aux filtres de l'UI
  const targetRows = rawDb.scores.filter(row => {
    if (row.model_id !== modelId) return false;
    if (filterDimension !== "all" && row.dimension !== filterDimension) return false;
    if (filterCategory && row.category !== filterCategory) return false;
    return true;
  });

  // Calculer la moyenne pondérée au niveau métrique
  targetRows.forEach(row => {
    const weight = getMetricCoefficient(row.metric);
    totalWeightedScores += row.score * weight;
    totalWeights += weight;
  });

  if (totalWeights === 0) return 0;
  
  // Retourne le score final arrondi à 2 décimales
  return Math.round((totalWeightedScores / totalWeights) * 100) / 100;
}
