import type { GraphEdge, GraphNode, KnowledgeGraph, QuestionPath } from "@/types/graph";

/**
 * Merge multiple KnowledgeGraph payloads produced from question batches.
 * - Dedupe nodes by id (merge appearsInQuestions)
 * - Dedupe edges by from+to
 * - Merge courses, questionPaths, ipaByQuestion
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

  return {
    globalNodes: Array.from(nodeMap.values()),
    edges,
    courses,
    questionPaths,
    ipaByQuestion: Object.keys(ipaByQuestion).length ? ipaByQuestion : undefined,
  };
}
