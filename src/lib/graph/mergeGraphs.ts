import type { GraphEdge, GraphNode, KnowledgeGraph, QuestionPath } from "@/types/graph";

/**
 * Semantic similarity heuristic - checks if two skills are likely duplicates
 * Uses word overlap after normalization to detect similar skill names
 */
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
    
    // Avoid self-loops and duplicates
    if (!edgeSet.has(key) && from !== to) {
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
 * Merge multiple KnowledgeGraph payloads produced from question batches.
 * - Dedupe nodes by id (merge appearsInQuestions)
 * - Dedupe edges by from+to
 * - Merge courses, questionPaths, ipaByQuestion
 * - Apply semantic deduplication as final pass
 */
export function mergeGraphs(graphs: KnowledgeGraph[]): KnowledgeGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  const courses: KnowledgeGraph["courses"] = {};
  const questionPaths: Record<string, QuestionPath | string[]> = {};
  const ipaByQuestion: NonNullable<KnowledgeGraph["ipaByQuestion"]> = {};

  for (const graph of graphs) {
    // Merge nodes (dedupe by id)
    for (const node of graph.globalNodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
        continue;
      }

      // Merge appearsInQuestions arrays
      const existing = nodeMap.get(node.id)!;
      const existingQuestions = existing.knowledgePoint?.appearsInQuestions || [];
      const newQuestions = node.knowledgePoint?.appearsInQuestions || [];
      const merged = [...new Set([...existingQuestions, ...newQuestions])];
      existing.knowledgePoint = { ...existing.knowledgePoint, appearsInQuestions: merged };
    }

    // Merge edges (dedupe by from+to)
    for (const edge of graph.edges) {
      const key = `${edge.from}:${edge.to}`;
      if (!edgeSet.has(key)) {
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

    // Merge IPA
    if (graph.ipaByQuestion) {
      Object.assign(ipaByQuestion, graph.ipaByQuestion);
    }
  }

  // After initial merge, apply semantic deduplication to catch near-duplicates
  const dedupResult = deduplicateSemanticDuplicates(
    Array.from(nodeMap.values()),
    edges,
    questionPaths
  );

  return {
    globalNodes: dedupResult.nodes,
    edges: dedupResult.edges,
    courses,
    questionPaths: dedupResult.questionPaths,
    ipaByQuestion: Object.keys(ipaByQuestion).length ? ipaByQuestion : undefined,
  };
}
