import type { GraphNode, GraphEdge } from '@/types/graph';
import type { SkillSubtopic, SkillTopic } from '@/types/grouping';

export interface SuperNode {
  id: string;
  name: string;
  color: string;
  skillCount: number;
  skillIds: string[];
  level: number;
  type: 'subtopic' | 'topic';
}

export interface GroupedGraphData {
  nodes: (GraphNode | SuperNode)[];
  edges: GraphEdge[];
  isSuperNode: (id: string) => boolean;
}

function isSuperNodeObj(n: any): n is SuperNode {
  return 'type' in n && (n.type === 'subtopic' || n.type === 'topic');
}

export function buildSubtopicView(
  nodes: GraphNode[],
  edges: GraphEdge[],
  subtopics: SkillSubtopic[],
  skillSubtopicMap: Map<string, string>,
): GroupedGraphData {
  const superNodeIds = new Set<string>();

  // Group skills by subtopic
  const subtopicSkills = new Map<string, string[]>();
  const ungroupedNodes: GraphNode[] = [];

  for (const node of nodes) {
    const stId = skillSubtopicMap.get(node.id);
    if (stId) {
      if (!subtopicSkills.has(stId)) subtopicSkills.set(stId, []);
      subtopicSkills.get(stId)!.push(node.id);
    } else {
      ungroupedNodes.push(node);
    }
  }

  // Create super nodes
  const superNodes: SuperNode[] = [];
  for (const st of subtopics) {
    const skills = subtopicSkills.get(st.id) || [];
    if (skills.length === 0) continue;
    const snId = `subtopic_${st.id}`;
    superNodeIds.add(snId);
    superNodes.push({
      id: snId,
      name: st.name,
      color: st.color,
      skillCount: skills.length,
      skillIds: skills,
      level: 0,
      type: 'subtopic',
    });
  }

  // Map skill -> superNode id
  const skillToSuperNode = new Map<string, string>();
  for (const sn of superNodes) {
    for (const sid of sn.skillIds) {
      skillToSuperNode.set(sid, sn.id);
    }
  }

  // Derive edges between super nodes / ungrouped nodes
  const derivedEdgeSet = new Set<string>();
  const derivedEdges: GraphEdge[] = [];

  for (const edge of edges) {
    const fromSN = skillToSuperNode.get(edge.from) || edge.from;
    const toSN = skillToSuperNode.get(edge.to) || edge.to;
    if (fromSN === toSN) continue;
    const key = `${fromSN}->${toSN}`;
    if (derivedEdgeSet.has(key)) continue;
    derivedEdgeSet.add(key);
    derivedEdges.push({ from: fromSN, to: toSN, reason: '' });
  }

  // Recompute levels for the grouped view
  const incoming = new Map<string, Set<string>>();
  for (const e of derivedEdges) {
    if (!incoming.has(e.to)) incoming.set(e.to, new Set());
    incoming.get(e.to)!.add(e.from);
  }

  const allGroupedIds = new Set([
    ...superNodes.map(n => n.id),
    ...ungroupedNodes.map(n => n.id),
  ]);

  const levelMap = new Map<string, number>();
  function getLevel(id: string, visited: Set<string>): number {
    if (levelMap.has(id)) return levelMap.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const prereqs = [...(incoming.get(id) || [])].filter(p => allGroupedIds.has(p));
    const level = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(p => getLevel(p, new Set(visited))));
    levelMap.set(id, level);
    return level;
  }

  for (const id of allGroupedIds) getLevel(id, new Set());

  // Update levels
  for (const sn of superNodes) sn.level = levelMap.get(sn.id) ?? 0;
  const leveledUngrouped = ungroupedNodes.map(n => ({
    ...n,
    level: levelMap.get(n.id) ?? 0,
  }));

  return {
    nodes: [...superNodes, ...leveledUngrouped],
    edges: derivedEdges,
    isSuperNode: (id) => superNodeIds.has(id),
  };
}

export function buildTopicView(
  nodes: GraphNode[],
  edges: GraphEdge[],
  subtopics: SkillSubtopic[],
  topics: SkillTopic[],
  skillSubtopicMap: Map<string, string>,
): GroupedGraphData {
  const superNodeIds = new Set<string>();

  // Build subtopic -> topic map
  const subtopicToTopic = new Map<string, string>();
  for (const st of subtopics) {
    if (st.topicId) subtopicToTopic.set(st.id, st.topicId);
  }

  // Map skill -> topic
  const skillToTopic = new Map<string, string>();
  for (const node of nodes) {
    const stId = skillSubtopicMap.get(node.id);
    if (stId) {
      const topicId = subtopicToTopic.get(stId);
      if (topicId) skillToTopic.set(node.id, topicId);
    }
  }

  // Group by topic
  const topicSkills = new Map<string, string[]>();
  const ungroupedNodes: GraphNode[] = [];

  for (const node of nodes) {
    const topicId = skillToTopic.get(node.id);
    if (topicId) {
      if (!topicSkills.has(topicId)) topicSkills.set(topicId, []);
      topicSkills.get(topicId)!.push(node.id);
    } else {
      ungroupedNodes.push(node);
    }
  }

  const superNodes: SuperNode[] = [];
  for (const topic of topics) {
    const skills = topicSkills.get(topic.id) || [];
    if (skills.length === 0) continue;
    const snId = `topic_${topic.id}`;
    superNodeIds.add(snId);
    superNodes.push({
      id: snId,
      name: topic.name,
      color: topic.color,
      skillCount: skills.length,
      skillIds: skills,
      level: 0,
      type: 'topic',
    });
  }

  const skillToSuperNode = new Map<string, string>();
  for (const sn of superNodes) {
    for (const sid of sn.skillIds) {
      skillToSuperNode.set(sid, sn.id);
    }
  }

  // Derive edges
  const derivedEdgeSet = new Set<string>();
  const derivedEdges: GraphEdge[] = [];
  for (const edge of edges) {
    const fromSN = skillToSuperNode.get(edge.from) || edge.from;
    const toSN = skillToSuperNode.get(edge.to) || edge.to;
    if (fromSN === toSN) continue;
    const key = `${fromSN}->${toSN}`;
    if (derivedEdgeSet.has(key)) continue;
    derivedEdgeSet.add(key);
    derivedEdges.push({ from: fromSN, to: toSN, reason: '' });
  }

  // Recompute levels
  const incoming = new Map<string, Set<string>>();
  for (const e of derivedEdges) {
    if (!incoming.has(e.to)) incoming.set(e.to, new Set());
    incoming.get(e.to)!.add(e.from);
  }

  const allIds = new Set([...superNodes.map(n => n.id), ...ungroupedNodes.map(n => n.id)]);
  const levelMap = new Map<string, number>();
  function getLevel(id: string, visited: Set<string>): number {
    if (levelMap.has(id)) return levelMap.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const prereqs = [...(incoming.get(id) || [])].filter(p => allIds.has(p));
    const level = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(p => getLevel(p, new Set(visited))));
    levelMap.set(id, level);
    return level;
  }

  for (const id of allIds) getLevel(id, new Set());

  for (const sn of superNodes) sn.level = levelMap.get(sn.id) ?? 0;
  const leveledUngrouped = ungroupedNodes.map(n => ({
    ...n,
    level: levelMap.get(n.id) ?? 0,
  }));

  return {
    nodes: [...superNodes, ...leveledUngrouped],
    edges: derivedEdges,
    isSuperNode: (id) => superNodeIds.has(id),
  };
}
