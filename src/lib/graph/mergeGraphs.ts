import type { GraphEdge, GraphNode, KnowledgeGraph, QuestionPath, CME, LE, KnowledgePoint } from "@/types/graph";

// Default values for missing node fields
const DEFAULT_CME: CME = {
  measured: false,
  highestConceptLevel: 0,
  levelLabels: ['Recognition', 'Recall (simple)', 'Recall (complex)', 'Direct application'],
  independence: 'Unknown',
  retention: 'Unknown',
  evidenceByLevel: {},
};

const DEFAULT_LE: LE = {
  estimated: true,
  estimatedMinutes: 20,
};

const DEFAULT_KNOWLEDGE_POINT: KnowledgePoint = {
  atomicityCheck: 'Auto-generated skill',
  assessmentExample: '',
  targetAssessmentLevel: 3,
  appearsInQuestions: [],
};

/**
 * Normalize a node to ensure all required fields exist
 */
function normalizeNode(node: Partial<GraphNode> & { id: string; name: string }): GraphNode {
  return {
    ...node,
    id: node.id,
    name: node.name,
    level: node.level ?? 0,
    description: node.description ?? '',
    tier: node.tier ?? 'core',
    knowledgePoint: {
      ...DEFAULT_KNOWLEDGE_POINT,
      ...node.knowledgePoint,
    },
    cme: {
      ...DEFAULT_CME,
      ...node.cme,
    },
    le: {
      ...DEFAULT_LE,
      ...node.le,
    },
    transferableContexts: node.transferableContexts ?? [],
  };
}
function areSemanticallyEquivalent(a: GraphNode, b: GraphNode): boolean {
  // Normalize names for comparison
  const normalize = (s: string) => s.toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const nameA = normalize(a.name);
  const nameB = normalize(b.name);
  
  // Exact match after normalization
  if (nameA === nameB) return true;
  
  // Check word overlap
  const wordsA = new Set(nameA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(nameB.split(' ').filter(w => w.length > 2));
  
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  
  // If 60%+ word overlap and same tier, likely duplicate
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const overlapRatio = intersection.length / Math.max(wordsA.size, wordsB.size);
  
  if (overlapRatio >= 0.6 && a.tier === b.tier) return true;
  
  return false;
}

/**
 * Deduplicate semantically similar nodes and remap all references
 */
function deduplicateSemanticDuplicates(
  nodes: GraphNode[], 
  edges: GraphEdge[], 
  questionPaths: Record<string, QuestionPath | string[]>
): { nodes: GraphNode[]; edges: GraphEdge[]; questionPaths: Record<string, QuestionPath | string[]> } {
  const idMapping = new Map<string, string>(); // old ID → canonical ID
  const canonicalNodes: GraphNode[] = [];
  
  for (const node of nodes) {
    // Check if this node is a semantic duplicate of an existing canonical node
    const existingCanonical = canonicalNodes.find(c => areSemanticallyEquivalent(c, node));
    
    if (existingCanonical) {
      // Log the merge for debugging
      console.warn(
        `[mergeGraphs] Semantic duplicate detected: "${node.name}" (${node.id}) ` +
        `merged into "${existingCanonical.name}" (${existingCanonical.id})`
      );
      
      // Map this node's ID to the canonical ID
      idMapping.set(node.id, existingCanonical.id);
      
      // Merge appearsInQuestions
      const existingQuestions = existingCanonical.knowledgePoint?.appearsInQuestions || [];
      const newQuestions = node.knowledgePoint?.appearsInQuestions || [];
      existingCanonical.knowledgePoint = { 
        ...existingCanonical.knowledgePoint, 
        appearsInQuestions: [...new Set([...existingQuestions, ...newQuestions])]
      };
    } else {
      canonicalNodes.push(node);
      idMapping.set(node.id, node.id);
    }
  }
  
  // Remap edge IDs
  const remappedEdges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  
  for (const edge of edges) {
    const from = idMapping.get(edge.from) || edge.from;
    const to = idMapping.get(edge.to) || edge.to;
    const key = `${from}:${to}`;
    const reverseKey = `${to}:${from}`;
    
    // Avoid self-loops, duplicates, AND bidirectional cycles
    if (!edgeSet.has(key) && !edgeSet.has(reverseKey) && from !== to) {
      edgeSet.add(key);
      remappedEdges.push({ ...edge, from, to });
    }
  }
  
  // Remap question paths
  const remappedPaths: Record<string, QuestionPath | string[]> = {};
  for (const [question, path] of Object.entries(questionPaths)) {
    if (Array.isArray(path)) {
      remappedPaths[question] = path.map(id => idMapping.get(id) || id);
    } else {
      remappedPaths[question] = {
        ...path,
        requiredNodes: path.requiredNodes?.map(id => idMapping.get(id) || id) || [],
        executionOrder: path.executionOrder?.map(id => idMapping.get(id) || id) || [],
      };
    }
  }
  
  return { nodes: canonicalNodes, edges: remappedEdges, questionPaths: remappedPaths };
}

/**
 * Transitive reduction: for each edge A->C, check if C is reachable
 * from A via other edges. If yes, A->C is redundant and removed.
 */
function transitiveReduce(edges: GraphEdge[]): GraphEdge[] {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    adj.get(e.from)!.add(e.to);
  }

  function isReachableWithout(start: string, target: string): boolean {
    const visited = new Set<string>();
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const neighbor of adj.get(node) || []) {
        if (node === start && neighbor === target) continue;
        if (neighbor === target) return true;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return false;
  }

  const reduced = edges.filter(e => {
    if (isReachableWithout(e.from, e.to)) {
      console.warn(`[mergeGraphs] Transitive reduction: removed ${e.from} -> ${e.to}`);
      adj.get(e.from)?.delete(e.to);
      return false;
    }
    return true;
  });

  console.log(`[mergeGraphs] Transitive reduction: ${edges.length} -> ${reduced.length} edges`);
  return reduced;
}

/**
 * Break cycles using Kahn's algorithm (topological sort).
 */
function breakCycles(edges: GraphEdge[]): GraphEdge[] {
  let currentEdges = [...edges];
  let iteration = 0;
  const maxIterations = 100;

  while (iteration < maxIterations) {
    iteration++;
    const allNodes = new Set<string>();
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const e of currentEdges) {
      allNodes.add(e.from);
      allNodes.add(e.to);
      inDegree.set(e.from, inDegree.get(e.from) || 0);
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e.to);
    }

    const queue: string[] = [];
    for (const node of allNodes) {
      if ((inDegree.get(node) || 0) === 0) queue.push(node);
    }

    const processed = new Set<string>();
    while (queue.length > 0) {
      const node = queue.shift()!;
      processed.add(node);
      for (const neighbor of adj.get(node) || []) {
        const deg = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) queue.push(neighbor);
      }
    }

    if (processed.size === allNodes.size) break;

    const cycleEdges = currentEdges.filter(e => !processed.has(e.from) && !processed.has(e.to));
    if (cycleEdges.length === 0) break;

    const removed = cycleEdges[cycleEdges.length - 1];
    console.warn(`[mergeGraphs] Cycle breaking: removed ${removed.from} -> ${removed.to}`);
    currentEdges = currentEdges.filter(e => !(e.from === removed.from && e.to === removed.to));
  }

  if (currentEdges.length < edges.length) {
    console.log(`[mergeGraphs] Cycle breaking: ${edges.length} -> ${currentEdges.length} edges`);
  }
  return currentEdges;
}

/**
 * Recompute node levels from the final edge structure.
 */
function recomputeLevels(nodes: GraphNode[], edges: GraphEdge[]): void {
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    incoming.get(e.to)!.push(e.from);
  }

  const nodeIds = new Set(nodes.map(n => n.id));
  const levelMap = new Map<string, number>();

  function getLevel(id: string, visited: Set<string>): number {
    if (levelMap.has(id)) return levelMap.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const prereqs = (incoming.get(id) || []).filter(p => nodeIds.has(p));
    const level = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(p => getLevel(p, visited)));
    levelMap.set(id, level);
    return level;
  }

  for (const node of nodes) {
    node.level = getLevel(node.id, new Set());
  }
  console.log(`[mergeGraphs] Recomputed levels: max depth = ${Math.max(0, ...nodes.map(n => n.level))}`);
}

/**
 * Validate question paths: remove references to non-existent nodes.
 */
function validateQuestionPaths(
  questionPaths: Record<string, QuestionPath | string[]>,
  nodeIds: Set<string>
): Record<string, QuestionPath | string[]> {
  const validated: Record<string, QuestionPath | string[]> = {};
  for (const [question, path] of Object.entries(questionPaths)) {
    if (Array.isArray(path)) {
      const filtered = path.filter(id => nodeIds.has(id));
      if (filtered.length > 0) validated[question] = filtered;
    } else {
      const filteredRequired = (path.requiredNodes || []).filter(id => nodeIds.has(id));
      const filteredOrder = (path.executionOrder || []).filter(id => nodeIds.has(id));
      if (filteredRequired.length > 0) {
        validated[question] = { ...path, requiredNodes: filteredRequired, executionOrder: filteredOrder };
      }
    }
  }
  return validated;
}

/**
 * Merge multiple KnowledgeGraph payloads produced from question batches.
 * - Dedupe nodes by id (merge appearsInQuestions)
 * - Dedupe edges by from+to
 * - Merge courses, questionPaths, ipaByQuestion
 * - Apply semantic deduplication as final pass
 * - Normalize all nodes to ensure required fields exist
 */
export function mergeGraphs(graphs: KnowledgeGraph[]): KnowledgeGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  const courses: KnowledgeGraph["courses"] = {};
  const questionPaths: Record<string, QuestionPath | string[]> = {};

  for (const graph of graphs) {
    // Merge nodes (dedupe by id) - normalize each node
    for (const node of graph.globalNodes) {
      const normalized = normalizeNode(node);
      
      if (!nodeMap.has(normalized.id)) {
        nodeMap.set(normalized.id, normalized);
        continue;
      }

      // Merge appearsInQuestions arrays
      const existing = nodeMap.get(normalized.id)!;
      const existingQuestions = existing.knowledgePoint?.appearsInQuestions || [];
      const newQuestions = normalized.knowledgePoint?.appearsInQuestions || [];
      const merged = [...new Set([...existingQuestions, ...newQuestions])];
      existing.knowledgePoint = { ...existing.knowledgePoint, appearsInQuestions: merged };
    }

    // Merge edges (dedupe by from+to)
    for (const edge of graph.edges) {
      const key = `${edge.from}:${edge.to}`;
      const reverseKey = `${edge.to}:${edge.from}`;
      if (!edgeSet.has(key) && !edgeSet.has(reverseKey)) {
        edgeSet.add(key);
        edges.push(edge);
      }
    }

    // Merge courses
    for (const [courseName, courseData] of Object.entries(graph.courses || {})) {
      if (!courses[courseName]) {
        courses[courseName] = { nodes: [] };
      }
      const existingIds = new Set(courses[courseName].nodes.map((n) => n.id));
      for (const node of courseData.nodes) {
        if (!existingIds.has(node.id)) {
          courses[courseName].nodes.push(node);
          existingIds.add(node.id);
        }
      }
    }

    // Merge question paths
    Object.assign(questionPaths, graph.questionPaths || {});
  }

  // After initial merge, apply semantic deduplication to catch near-duplicates
  const dedupResult = deduplicateSemanticDuplicates(
    Array.from(nodeMap.values()),
    edges,
    questionPaths
  );

  // Apply transitive reduction to remove redundant edges across batches
  const reducedEdges = transitiveReduce(dedupResult.edges);

  // Break any remaining cycles (Kahn's algorithm)
  const acyclicEdges = breakCycles(reducedEdges);

  // Orphan edge cleanup: remove edges referencing non-existent nodes
  const nodeIds = new Set(dedupResult.nodes.map(n => n.id));
  const cleanEdges = acyclicEdges.filter(e => {
    const valid = nodeIds.has(e.from) && nodeIds.has(e.to);
    if (!valid) console.warn(`[mergeGraphs] Orphan cleanup: removed ${e.from} -> ${e.to}`);
    return valid;
  });

  // Recompute levels from final edge structure
  recomputeLevels(dedupResult.nodes, cleanEdges);

  // Validate question paths: remove references to non-existent nodes
  const validatedPaths = validateQuestionPaths(dedupResult.questionPaths, nodeIds);

  return {
    globalNodes: dedupResult.nodes,
    edges: cleanEdges,
    courses,
    questionPaths: validatedPaths,
    ipaByQuestion: undefined,
  };
}
